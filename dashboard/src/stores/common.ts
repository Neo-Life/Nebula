import { defineStore } from 'pinia';
import axios from 'axios';

import type { PluginMarketItem } from '@/types/extension';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type CommonState = {
  startTime: number;
  pluginMarketData: PluginMarketItem[];
};

export const useCommonStore = defineStore('common', {
  state: (): CommonState => ({
    startTime: -1,
    pluginMarketData: [],
  }),
  actions: {
    getStartTime() {
      if (this.startTime !== -1) {
        return this.startTime;
      }
      axios.get('/api/stat/start-time').then((res) => {
        this.startTime = res.data.data.start_time;
      });
    },

    async getPluginCollections(
      force = false,
      customSource: string | null = null,
    ): Promise<PluginMarketItem[]> {
      // 获取插件市场数据
      if (!force && this.pluginMarketData.length > 0 && !customSource) {
        return Promise.resolve(this.pluginMarketData);
      }

      // 构建URL
      let url = force
        ? '/api/plugin/market_list?force_refresh=true'
        : '/api/plugin/market_list';
      if (customSource) {
        url +=
          (url.includes('?') ? '&' : '?') +
          `custom_registry=${encodeURIComponent(customSource)}`;
      }

      return axios
        .get(url)
        .then((res) => {
          const data: PluginMarketItem[] = [];
          const payload: unknown = res.data?.data;
          if (isRecord(payload)) {
            for (const key in payload) {
              const pluginData = payload[key];
              const plugin = isRecord(pluginData) ? pluginData : {};

              data.push({
                name: typeof plugin.name === 'string' ? plugin.name : key, // 优先使用插件数据中的name字段，否则使用键名
                desc: typeof plugin.desc === 'string' ? plugin.desc : undefined,
                author:
                  typeof plugin.author === 'string' ? plugin.author : undefined,
                repo: typeof plugin.repo === 'string' ? plugin.repo : undefined,
                installed: false,
                version:
                  typeof plugin.version === 'string' ? plugin.version : '未知',
                social_link:
                  typeof plugin.social_link === 'string'
                    ? plugin.social_link
                    : undefined,
                tags: Array.isArray(plugin.tags)
                  ? plugin.tags.filter(
                      (tag): tag is string => typeof tag === 'string',
                    )
                  : [],
                logo: typeof plugin.logo === 'string' ? plugin.logo : '',
                pinned:
                  typeof plugin.pinned === 'boolean' ? plugin.pinned : false,
                stars: typeof plugin.stars === 'number' ? plugin.stars : 0,
                updated_at:
                  typeof plugin.updated_at === 'string'
                    ? plugin.updated_at
                    : '',
                display_name:
                  typeof plugin.display_name === 'string'
                    ? plugin.display_name
                    : '',
              });
            }
          }

          this.pluginMarketData = data;
          return data;
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    },
  },
});
