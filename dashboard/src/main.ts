import { createApp, type Plugin } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import confirmPlugin from './plugins/confirmPlugin';
import { setupI18n } from './i18n/composables';
import '@/scss/style.scss';
import VueApexCharts from 'vue3-apexcharts';

import print from 'vue3-print-nb';
import { loader } from '@guolao/vue-monaco-editor'
import axios from 'axios';
import { initShikiWasm } from '@/composables/shikiWasm';
import { MarkdownCodeBlockNode, setCustomComponents } from 'markstream-vue';

const mountApp = () => {
  const app = createApp(App);
  app.use(router);

  const pinia = createPinia();
  app.use(pinia);

  app.use(print);
  app.use(VueApexCharts as Plugin);
  app.use(vuetify);
  app.use(confirmPlugin);
  app.mount('#app');

  // 挂载后同步 Vuetify 主题
  import('./stores/customizer').then(({ useCustomizerStore }) => {
    const customizer = useCustomizerStore(pinia);
    vuetify.theme.global.name.value = customizer.uiTheme;
    const storedPrimary = localStorage.getItem('themePrimary');
    const storedSecondary = localStorage.getItem('themeSecondary');
    if (storedPrimary || storedSecondary) {
      const themes = vuetify.theme.themes.value;
      ['PurpleTheme', 'PurpleThemeDark'].forEach((name) => {
        const theme = themes[name];
        if (!theme?.colors) return;
        if (storedPrimary) theme.colors.primary = storedPrimary;
        if (storedSecondary) theme.colors.secondary = storedSecondary;
        if (storedPrimary && theme.colors.darkprimary) theme.colors.darkprimary = storedPrimary;
        if (storedSecondary && theme.colors.darksecondary) theme.colors.darksecondary = storedSecondary;
      });
    }
  });
};

const bootstrap = async () => {
  try {
    // 初始化 i18n 系统，等待完成后再挂载应用
    await setupI18n();
    console.log('🌍 i18n系统初始化完成');
  } catch (error) {
    console.error('❌ i18n系统初始化失败:', error);
  }

  // 无论 i18n 是否初始化成功，都初始化 Shiki 并挂载应用（i18n 内部有回退机制）
  await initShikiWasm();

  // Prefer Shiki-based code blocks over plain <pre> / Monaco.
  setCustomComponents({ code_block: MarkdownCodeBlockNode });

  mountApp();
};

void bootstrap();


axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  // Only attach our JWT to API requests. Never attach it to third-party origins
  // (e.g. GitHub API), otherwise those requests will fail and we may leak tokens.
  const urlStr = config.url;
  if (token && urlStr) {
    const resolved = new URL(urlStr, window.location.origin);
    const isApiRequest =
      resolved.origin === window.location.origin && resolved.pathname.startsWith('/api');
    if (isApiRequest) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Keep fetch() calls consistent with axios by automatically attaching the JWT.
// Some parts of the UI use fetch directly; without this, those requests will 401.
const _origFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('token');
  if (!token) return _origFetch(input, init);

  const inputUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  const resolved = new URL(inputUrl, window.location.origin);

  // Only attach token for same-origin /api calls.
  if (
    resolved.origin !== window.location.origin ||
    !resolved.pathname.startsWith('/api')
  ) {
    return _origFetch(input, init);
  }

  const headers = new Headers(
    init?.headers ||
      (typeof input !== 'string' && 'headers' in input
        ? (input as Request).headers
        : undefined),
  );
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return _origFetch(input, { ...init, headers });
};

loader.config({
  paths: {
    // Load Monaco from CDN instead of bundling/installing it locally.
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs',
  },
  // Some CDNs don't ship all language packs; stick to English to avoid loader errors.
  'vs/nls': { availableLanguages: { '*': 'en' } },
})
