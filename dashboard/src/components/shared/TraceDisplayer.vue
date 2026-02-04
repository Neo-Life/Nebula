<script lang="ts">
import axios from 'axios';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { defineComponent } from 'vue';

type TracePayload = {
  type?: string;
  span_id?: string;
  time?: number;
  action?: string;
  fields?: unknown;
  name?: string;
  umo?: string;
  sender_name?: string;
  message_outline?: string;
};

type TraceRecord = {
  time: number;
  action: string;
  fieldsText: string;
  timeLabel: string;
  key: string;
};

type TraceEvent = {
  span_id: string;
  name?: string;
  umo?: string;
  sender_name?: string;
  message_outline?: string;
  first_time: number;
  last_time: number;
  collapsed: boolean;
  visibleCount: number;
  records: TraceRecord[];
  hasAgentPrepare: boolean;
};

type HighlightMap = Record<string, true>;
type HighlightTimers = Record<string, ReturnType<typeof setTimeout>>;

export default defineComponent({
  name: 'TraceDisplayer',
  props: {
    autoScroll: {
      type: Boolean,
      default: true,
    },
    maxItems: {
      type: Number,
      default: 300,
    },
  },
  data() {
    return {
      events: [] as TraceEvent[],
      eventIndex: {} as Record<string, TraceEvent>,
      highlightMap: {} as HighlightMap,
      highlightTimers: {} as HighlightTimers,
      eventSource: null as EventSourcePolyfill | null,
      retryTimer: null as ReturnType<typeof setTimeout> | null,
      retryAttempts: 0,
      maxRetryAttempts: 10,
      baseRetryDelay: 1000,
      lastEventId: null as string | null,
      tableHeight: 'auto' as string,
    };
  },
  async mounted() {
    await this.fetchTraceHistory();
    this.connectSSE();
    this.updateTableHeight();
    window.addEventListener('resize', this.updateTableHeight);
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
    window.removeEventListener('resize', this.updateTableHeight);
  },
  methods: {
    toTitle(text: unknown, maxLen = 2000): string {
      const value = String(text ?? '');
      if (value.length <= maxLen) return value;
      return `${value.slice(0, maxLen)}…`;
    },
    updateTableHeight() {
      this.$nextTick(() => {
        const el = this.$refs.scrollEl as HTMLElement | undefined;
        if (!el || typeof window === 'undefined') return;
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight;
        const offsetTop = el.getBoundingClientRect().top;
        const height = Math.max(viewportHeight - offsetTop, 0);
        this.tableHeight = `${height}px`;
      });
    },
    async fetchTraceHistory() {
      try {
        const res = await axios.get('/api/log-history');
        const logs = (res as any)?.data?.data?.logs || [];
        const traces = (logs as TracePayload[]).filter(
          (item) => item.type === 'trace',
        );
        this.processNewTraces(traces);
      } catch (err) {
        console.error('Failed to fetch trace history:', err);
      }
    },
    connectSSE() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      const token = localStorage.getItem('token');

      this.eventSource = new EventSourcePolyfill('/api/live-log', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        heartbeatTimeout: 300000,
        withCredentials: true,
      });

      this.eventSource.onopen = () => {
        this.retryAttempts = 0;
        if (!this.lastEventId) {
          void this.fetchTraceHistory();
        }
      };

      this.eventSource.onmessage = (
        event: MessageEvent<string> & { lastEventId?: string },
      ) => {
        try {
          if (event.lastEventId) {
            this.lastEventId = event.lastEventId;
          }

          const payload = JSON.parse(event.data) as TracePayload;
          if (payload?.type !== 'trace') {
            return;
          }
          this.processNewTraces([payload]);
        } catch (e) {
          console.error('Failed to parse trace payload:', e);
        }
      };

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        if (this.retryAttempts >= this.maxRetryAttempts) {
          console.error('Trace stream reached max retry attempts.');
          return;
        }

        const delay = Math.min(
          this.baseRetryDelay * Math.pow(2, this.retryAttempts),
          30000,
        );

        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }

        this.retryTimer = setTimeout(async () => {
          this.retryAttempts++;
          if (!this.lastEventId) {
            await this.fetchTraceHistory();
          }
          this.connectSSE();
        }, delay);
      };
    },
    processNewTraces(newTraces: TracePayload[]) {
      if (!newTraces || newTraces.length === 0) return;

      let hasUpdate = false;
      const touched = new Set<string>();
      newTraces.forEach((trace) => {
        if (!trace.span_id || !trace.time || !trace.action) return;
        const recordKey = `${trace.time}-${trace.span_id}-${trace.action}`;
        let event = this.eventIndex[trace.span_id];
        if (!event) {
          event = {
            span_id: trace.span_id,
            name: trace.name,
            umo: trace.umo,
            sender_name: trace.sender_name,
            message_outline: trace.message_outline,
            first_time: trace.time,
            last_time: trace.time,
            collapsed: true,
            visibleCount: 20,
            records: [],
            hasAgentPrepare: trace.action === 'astr_agent_prepare',
          };
          this.eventIndex[trace.span_id] = event;
          this.events.push(event);
          hasUpdate = true;
        }

        const exists = event.records.some((item) => item.key === recordKey);
        if (exists) return;

        event.records.push({
          time: trace.time,
          action: trace.action,
          fieldsText: this.formatFields(trace.fields),
          timeLabel: this.formatTime(trace.time),
          key: recordKey,
        });
        if (trace.action === 'astr_agent_prepare') {
          event.hasAgentPrepare = true;
        }
        if (!event.first_time || trace.time < event.first_time) {
          event.first_time = trace.time;
        }
        if (!event.last_time || trace.time > event.last_time) {
          event.last_time = trace.time;
        }
        if (!event.sender_name && trace.sender_name) {
          event.sender_name = trace.sender_name;
        }
        if (!event.message_outline && trace.message_outline) {
          event.message_outline = trace.message_outline;
        }
        touched.add(trace.span_id);
        hasUpdate = true;
      });

      if (hasUpdate) {
        this.events.forEach((event) => {
          event.records.sort((a, b) => b.time - a.time);
        });
        this.events.sort((a, b) => b.first_time - a.first_time);
        if (this.events.length > this.maxItems) {
          const overflow = this.events.length - this.maxItems;
          const removed = this.events.splice(this.maxItems, overflow);
          removed.forEach((event) => {
            delete this.eventIndex[event.span_id];
          });
        }
        touched.forEach((spanId) => {
          this.pulseEvent(spanId);
        });
      }
    },
    scrollToBottom() {
      const el = this.$refs.scrollEl as HTMLElement | undefined;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    },
    toggleEvent(spanId: string) {
      const event = this.eventIndex[spanId];
      if (!event) return;
      event.collapsed = !event.collapsed;
    },
    showMore(spanId: string) {
      const event = this.eventIndex[spanId];
      if (!event) return;
      event.visibleCount = Math.min(
        event.records.length,
        event.visibleCount + 20,
      );
    },
    pulseEvent(spanId: string) {
      if (!spanId) return;
      if (this.highlightTimers[spanId]) {
        clearTimeout(this.highlightTimers[spanId]);
      }
      this.highlightMap = { ...this.highlightMap, [spanId]: true };
      const remove = setTimeout(() => {
        const next = { ...this.highlightMap };
        delete (next as any)[spanId];
        this.highlightMap = next;
        const timers = { ...this.highlightTimers };
        delete (timers as any)[spanId];
        this.highlightTimers = timers;
      }, 1200);
      this.highlightTimers = { ...this.highlightTimers, [spanId]: remove };
    },
    getVisibleRecords(event: TraceEvent): TraceRecord[] {
      if (!event.records.length) return [];
      return event.records.slice(0, event.visibleCount);
    },
    formatTime(ts?: number): string {
      if (!ts) return '';
      const date = new Date(ts * 1000);
      const base = date.toLocaleString();
      const ms = String(date.getMilliseconds()).padStart(3, '0');
      return `${base}.${ms}`;
    },
    shortSpan(spanId?: string): string {
      if (!spanId) return '';
      return spanId.slice(0, 8);
    },
    formatFields(fields: unknown): string {
      if (!fields) return '';
      try {
        const text = JSON.stringify(fields, null, 2);
        if (text.length > 2000) {
          return `${text}`;
        }
        return text;
      } catch {
        return String(fields);
      }
    },
  },
});
</script>

<template>
  <div class="trace-wrapper">
    <div ref="scrollEl" class="trace-table" :style="{ height: tableHeight }">
      <div class="trace-row trace-header">
        <div class="trace-cell time">Time</div>
        <div class="trace-cell span">Event ID</div>
        <div class="trace-cell umo">UMO</div>
        <!-- <div class="trace-cell count">Records</div> -->
        <!-- <div class="trace-cell last">Last</div> -->
        <div class="trace-cell sender">Sender</div>
        <div class="trace-cell outline">Outline</div>
        <div class="trace-cell fields" />
      </div>
      <div
        v-for="event in events"
        :key="event.span_id"
        class="trace-group"
        :class="{ highlight: highlightMap[event.span_id] }"
      >
        <div class="trace-row trace-event">
          <div class="trace-cell time" data-label="Time">
            {{ formatTime(event.first_time) }}
          </div>
          <div
            class="trace-cell span"
            data-label="Event ID"
            :title="event.span_id"
          >
            <div class="event-title">
              {{ shortSpan(event.span_id) }}
            </div>
          </div>
          <div class="trace-cell umo" data-label="UMO" :title="event.umo || ''">
            {{ event.umo }}
          </div>
          <!-- <div class="trace-cell count">
            <div class="event-meta">{{ event.records.length }}</div>
          </div> -->
          <!-- <div class="trace-cell last">
            <div class="event-meta">{{ formatTime(event.last_time) }}</div>
          </div> -->
          <div class="trace-cell sender" data-label="Sender">
            <div
              class="event-sub sender-text"
              :title="event.sender_name || '-'"
            >
              {{ event.sender_name || '-' }}
            </div>
          </div>
          <div class="trace-cell outline" data-label="Outline">
            <div
              class="event-sub outline"
              :title="event.message_outline || '-'"
            >
              {{ event.message_outline || '-' }}
            </div>
          </div>
          <div class="trace-cell fields event-controls" data-label="Controls">
            <v-btn
              class="toggle-btn"
              size="x-small"
              variant="text"
              color="primary"
              @click="toggleEvent(event.span_id)"
            >
              {{ event.collapsed ? 'Expand' : 'Collapse' }}
              <span v-if="event.hasAgentPrepare" class="agent-dot" />
            </v-btn>
          </div>
        </div>
        <div v-if="!event.collapsed" class="trace-records">
          <div
            v-for="record in getVisibleRecords(event)"
            :key="record.key"
            class="trace-record"
          >
            <div class="trace-record-time">
              {{ record.timeLabel }}
            </div>
            <div class="trace-record-action" :title="toTitle(record.action)">
              {{ record.action }}
            </div>
            <pre
              class="trace-record-fields"
              :title="toTitle(record.fieldsText)"
              >{{ record.fieldsText }}</pre
            >
          </div>
          <div
            v-if="event.visibleCount < event.records.length"
            class="event-more"
          >
            <v-btn
              size="x-small"
              variant="tonal"
              color="primary"
              @click="showMore(event.span_id)"
            >
              Show more
            </v-btn>
          </div>
        </div>
      </div>
      <div v-if="events.length === 0" class="trace-empty">
        No trace data yet.
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace-wrapper {
  height: 100%;
}

.trace-table {
  background: transparent;
  border-radius: 0;
  padding: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  color: rgb(var(--v-theme-on-surface));
  font-family: 'Fira Code', monospace;
}

.trace-row {
  display: grid;
  grid-template-columns: 200px 100px 260px 180px 1fr 140px;
  gap: 12px;
}

.trace-group {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: transparent;
  padding: 8px 0;
}

.trace-group.highlight {
  background: rgba(var(--v-theme-primary), 0.12);
  transition: background 0.6s ease;
}

.trace-event {
  align-items: start;
}

.trace-header {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  padding-bottom: 10px;
}

.trace-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}

.event-title {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.event-meta {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 4px;
}

.event-sub {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.8);
  margin-top: 2px;
  word-break: break-word;
}

.event-sub.outline {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.sender-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-controls {
  display: flex;
  justify-content: flex-end;
}

.agent-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  margin-left: 6px;
  vertical-align: middle;
}

.trace-cell.fields pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.trace-empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

@media (max-width: 1200px) {
  .trace-row {
    grid-template-columns: 160px 90px 200px 140px 1fr 120px;
  }

  .trace-cell.fields {
    grid-column: 1 / -1;
  }
}

.trace-record {
  display: grid;
  grid-template-columns: 200px 120px 1fr;
  gap: 8px;
  padding: 2px 0;
}

.trace-record:last-child {
  border-bottom: none;
}

.trace-record-time {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 11px;
}

.trace-record-action {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
  font-size: 11px;
}

.trace-record-fields {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 10px;
}

.event-more {
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

.trace-records {
  padding: 4px 0 2px 0;
}

@media (max-width: 960px) {
  .trace-row.trace-header {
    display: none;
  }

  .trace-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .trace-group {
    padding: 10px 0;
  }

  .trace-cell {
    display: flex;
    align-items: baseline;
    gap: 10px;
    overflow: visible;
    text-overflow: unset;
  }

  .trace-cell::before {
    content: attr(data-label);
    flex: 0 0 90px;
    color: rgba(var(--v-theme-on-surface), 0.7);
    font-weight: 600;
    font-size: 12px;
    line-height: 1.4;
  }

  .trace-cell > * {
    min-width: 0;
  }

  .trace-cell .event-sub {
    flex: 1 1 auto;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .sender-text {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    overflow-wrap: anywhere;
  }

  .event-controls {
    justify-content: flex-start;
    align-items: baseline;
  }

  .toggle-btn {
    /* Keep height close to label text line-height */
    --v-btn-height: 18px;
    height: 18px;
    padding-inline: 0px;
    padding-block: 0px;
    min-width: 0;
    font-size: 12px;
  }

  .toggle-btn :deep(.v-btn__content) {
    line-height: 1.4;
  }

  .trace-record {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 6px 0;
  }

  .trace-record-fields {
    font-size: 10px;
  }
}
</style>
