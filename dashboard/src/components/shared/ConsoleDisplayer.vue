<script setup lang="ts">
import axios from 'axios';
import { EventSourcePolyfill } from 'event-source-polyfill';
</script>

<template>
  <div>
    <div class="filter-controls mb-2" v-if="showLevelBtns">
      <v-chip-group v-model="selectedLevels" column multiple>
        <v-chip v-for="level in logLevels" :key="level" :color="getLevelColor(level)" filter variant="flat" size="small"
          :text-color="level === 'DEBUG' || level === 'INFO' ? 'black' : 'white'" class="font-weight-medium">
          {{ level }}
        </v-chip>
      </v-chip-group>
    </div>

    <div ref="term" style="background-color: #1e1e1e; padding: 16px; border-radius: 8px; overflow-y:auto; height: 100%">
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ConsoleDisplayer',
  data() {
    return {
      maxLocalLogCacheLen: 1000,
      autoScroll: true,
      logColorAnsiMap: {
        '\u001b[1;34m': 'color: #0000FF; font-weight: bold;',
        '\u001b[1;36m': 'color: #00FFFF; font-weight: bold;',
        '\u001b[1;33m': 'color: #FFFF00; font-weight: bold;',
        '\u001b[31m': 'color: #FF0000;',
        '\u001b[1;31m': 'color: #FF0000; font-weight: bold;',
        '\u001b[0m': 'color: inherit; font-weight: normal;',
        '\u001b[32m': 'color: #00FF00;',
        'default': 'color: #FFFFFF;'
      },
      logLevels: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
      selectedLevels: [0, 1, 2, 3, 4],
      levelColors: {
        'DEBUG': 'grey',
        'INFO': 'blue-lighten-3',
        'WARNING': 'amber',
        'ERROR': 'red',
        'CRITICAL': 'purple'
      },
      localLogCache: [],
      eventSource: null,
      retryTimer: null,
      retryAttempts: 0,           
      maxRetryAttempts: 10,       
      baseRetryDelay: 1000,       
      lastEventId: null,          
    }
  },
  props: {
    historyNum: {
      type: String,
      default: "-1"
    },
    showLevelBtns: {
      type: Boolean,
      default: true
    }
  },
  watch: {
    selectedLevels: {
      handler() {
        this.refreshDisplay();
      },
      deep: true
    }
  },
  async mounted() {
    await this.fetchLogHistory();

    const token = localStorage.getItem('token');
    if (token) {
      this.connectSSE();
    }
  },
  beforeUnmount() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryAttempts = 0;
  },
  methods: {
    normalizeLog(log) {
      const rawTime = (log && Object.prototype.hasOwnProperty.call(log, 'time')) ? log.time : 0;
      const timeNum = typeof rawTime === 'string' ? Number.parseFloat(rawTime) : Number(rawTime ?? 0);
      const timeMs = Number.isFinite(timeNum) ? Math.round(timeNum * 1000) : 0;

      return {
        ...log,
        time: Number.isFinite(timeNum) ? timeNum : 0,
        __timeMs: timeMs,
        level: (log?.level ?? '').toString(),
        data: (log?.data ?? '').toString(),
      };
    },

    connectSSE() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      console.log(`正在连接日志流... (尝试次数: ${this.retryAttempts})`);
      
      const token = localStorage.getItem('token');
      if (!token) {
        // 未登录时不要连接（否则后端会刷大量 401）
        return;
      }

      this.eventSource = new EventSourcePolyfill('/api/live-log', {
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        },
        heartbeatTimeout: 300000, 
        withCredentials: true 
      });

      this.eventSource.onopen = () => {
        console.log('日志流连接成功！');
        this.retryAttempts = 0;

        if (this.localLogCache.length === 0) {
          this.fetchLogHistory();
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (event.lastEventId) {
            this.lastEventId = event.lastEventId;
          }

          const payload = JSON.parse(event.data);
          this.processNewLogs([payload]);
        } catch (e) {
          console.error('解析日志失败:', e);
        }
      };

      this.eventSource.onerror = (err) => {

        const status = (err as any)?.status;
        if (status === 401 || status === 403) {
          console.error(`鉴权失败 (${status})，停止重连。请重新登录/刷新页面。`);
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
          }
          this.retryAttempts = this.maxRetryAttempts;
          return;
        }

        console.warn('日志流连接错误:', err);
        
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.retryAttempts >= this.maxRetryAttempts) {
            console.error('❌ 已达到最大重试次数，停止重连。请刷新页面重试。');
            return; 
        }

        const delay = Math.min(
            this.baseRetryDelay * Math.pow(2, this.retryAttempts),
            30000
        );
        
        console.log(`⏳ ${delay}ms 后尝试第 ${this.retryAttempts + 1} 次重连...`);

        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }

        this.retryTimer = setTimeout(async () => {
          this.retryAttempts++;
          
          if (!this.lastEventId) {
             await this.fetchLogHistory();
          }
          
          this.connectSSE();
        }, delay);
      };
    },

    processNewLogs(newLogs) {
      if (!newLogs || newLogs.length === 0) return;

      let hasUpdate = false;

      newLogs.forEach(log => {

        const normalized = this.normalizeLog(log);

        const exists = this.localLogCache.some(existing =>
          existing.__timeMs === normalized.__timeMs &&
          existing.data === normalized.data &&
          existing.level === normalized.level
        );
        
        if (!exists) {
            this.localLogCache.push(normalized);
            hasUpdate = true;
            
            if (this.isLevelSelected(normalized.level)) {
              this.printLog(normalized.data);
            }
        }
      });

      if (hasUpdate) {
        this.localLogCache.sort((a, b) => a.__timeMs - b.__timeMs);
        
        const maxSize = this.maxLocalLogCacheLen || 200;
        if (this.localLogCache.length > maxSize) {
           this.localLogCache.splice(0, this.localLogCache.length - maxSize);
        }
      }
    },

    async fetchLogHistory() {
      try {
        const res = await axios.get('/api/log-history');
        if (res.data.data.logs && res.data.data.logs.length > 0) {
          this.processNewLogs(res.data.data.logs);
        }
      } catch (err) {
        console.error('Failed to fetch log history:', err);
      }
    },
    
    getLevelColor(level) {
      return this.levelColors[level] || 'grey';
    },

    isLevelSelected(level) {
      for (let i = 0; i < this.selectedLevels.length; ++i) {
        let level_ = this.logLevels[this.selectedLevels[i]]
        if (level_ === level) {
          return true;
        }
      }
      return false;
    },

    refreshDisplay() {
      const termElement = this.$refs.term as HTMLElement | undefined;
      if (termElement) {
        termElement.innerHTML = '';
        
        if (this.localLogCache && this.localLogCache.length > 0) {
          this.localLogCache.forEach(logItem => {
            if (this.isLevelSelected(logItem.level)) {
              this.printLog(logItem.data);
            }
          });
        }
      }
    },

    toggleAutoScroll() {
      this.autoScroll = !this.autoScroll;
    },

    printLog(log) {
      const ele = this.$refs.term as HTMLElement | undefined;
      if (!ele) {
        return;
      }
      
      let span = document.createElement('pre')
      let style = this.logColorAnsiMap['default']
      for (let key in this.logColorAnsiMap) {
        if (log.startsWith(key)) {
          style = this.logColorAnsiMap[key]
          log = log.replace(key, '').replace('\u001b[0m', '')
          break
        }
      }

      span.style.cssText =
        style +
        'display: block; font-size: 12px; font-family: Consolas, monospace; white-space: pre-wrap; margin-bottom: 2px;'
      span.classList.add('fade-in')
      span.innerText = `${log}`;
      ele.appendChild(span)
      if (this.autoScroll) {
        ele.scrollTop = ele.scrollHeight
      }
    }
  },
}
</script>

<style scoped>
.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  margin-left: 20px;
}

.fade-in {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
