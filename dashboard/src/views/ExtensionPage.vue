<script setup>
import InstalledExtensionsSection from '@/components/extension/InstalledExtensionsSection.vue';
import MarketExtensionsSection from '@/components/extension/MarketExtensionsSection.vue';
import AstrBotConfig from '@/components/shared/AstrBotConfig.vue';
import ConsoleDisplayer from '@/components/shared/ConsoleDisplayer.vue';
import ReadmeDialog from '@/components/shared/ReadmeDialog.vue';
import ProxySelector from '@/components/shared/ProxySelector.vue';
import UninstallConfirmDialog from '@/components/shared/UninstallConfirmDialog.vue';
import McpServersSection from '@/components/extension/McpServersSection.vue';
import ComponentPanel from '@/components/extension/componentPanel/index.vue';
import axios from 'axios';
import { pinyin } from 'pinyin-pro';
import { useCommonStore } from '@/stores/common';
import { useModuleI18n } from '@/i18n/composables';
import defaultPluginIcon from '@/assets/images/plugin_icon.png';

import { ref, computed, onMounted, reactive, watch } from 'vue';

const commonStore = useCommonStore();
const { tm } = useModuleI18n('features/extension');
// 检查指令冲突并提示
const conflictDialog = reactive({
  show: false,
  count: 0
});
const checkAndPromptConflicts = async () => {
  try {
    const res = await axios.get('/api/commands');
    if (res.data.status === 'ok') {
      const conflicts = res.data.data.summary?.conflicts || 0;
      if (conflicts > 0) {
        conflictDialog.count = conflicts;
        conflictDialog.show = true;
      }
    }
  } catch (err) {
    console.debug('Failed to check command conflicts:', err);
  }
};
const handleConflictConfirm = () => {
  activeTab.value = 'commands';
};

const fileInput = ref(null);
const activeTab = ref('installed');
const extension_data = reactive({
  data: [],
  message: ''
});
const showReserved = ref(false);
const snack_message = ref('');
const snack_show = ref(false);
const snack_success = ref('success');
const configDialog = ref(false);
const extension_config = reactive({
  metadata: {},
  config: {}
});
const pluginMarketData = ref([]);
const loadingDialog = reactive({
  show: false,
  title: '',
  statusCode: 0,
  result: ''
});
const showPluginInfoDialog = ref(false);
const selectedPlugin = ref({});
const curr_namespace = ref('');
const updatingAll = ref(false);

const readmeDialog = reactive({
  show: false,
  pluginName: '',
  repoUrl: null
});

const isListView = ref(false);
const pluginSearch = ref('');
const loading_ = ref(false);

const currentPage = ref(1);
const displayItemsPerPage = 9;

const dangerConfirmDialog = ref(false);
const selectedDangerPlugin = ref(null);

const showUninstallDialog = ref(false);
const pluginToUninstall = ref(null);

const showSourceDialog = ref(false);
const sourceName = ref('');
const sourceUrl = ref('');
const customSources = ref([]);
const selectedSource = ref(null);
const showRemoveSourceDialog = ref(false);
const sourceToRemove = ref(null);
const editingSource = ref(false);
const originalSourceUrl = ref('');

const extension_url = ref('');
const dialog = ref(false);
const upload_file = ref(null);
const uploadTab = ref('file');
const showPluginFullName = ref(false);
const marketSearch = ref('');
const debouncedMarketSearch = ref('');
const refreshingMarket = ref(false);
const sortBy = ref('default');
const sortOrder = ref('desc');

const sortOptions = computed(() => [
  { title: tm('sort.default'), value: 'default' },
  { title: tm('sort.stars'), value: 'stars' },
  { title: tm('sort.author'), value: 'author' },
  { title: tm('sort.updated'), value: 'updated' }
]);

const normalizeStr = s => (s ?? '').toString().toLowerCase().trim();
const toPinyinText = s => pinyin(s ?? '', { toneType: 'none' }).toLowerCase().replace(/\s+/g, '');
const toInitials = s => pinyin(s ?? '', { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s+/g, '');
const marketCustomFilter = (value, query, item) => {
  const q = normalizeStr(query);
  if (!q) return true;

  const candidates = new Set();
  if (value != null) candidates.add(String(value));
  if (item?.name) candidates.add(String(item.name));
  if (item?.trimmedName) candidates.add(String(item.trimmedName));
  if (item?.desc) candidates.add(String(item.desc));
  if (item?.author) candidates.add(String(item.author));

  for (const v of candidates) {
    const nv = normalizeStr(v);
    if (nv.includes(q)) return true;
    const pv = toPinyinText(v);
    if (pv.includes(q)) return true;
    const iv = toInitials(v);
    if (iv.includes(q)) return true;
  }
  return false;
};

const plugin_handler_info_headers = computed(() => [
  { title: tm('table.headers.eventType'), key: 'event_type_h' },
  { title: tm('table.headers.description'), key: 'desc', maxWidth: '250px' },
  { title: tm('table.headers.specificType'), key: 'type' },
  { title: tm('table.headers.trigger'), key: 'cmd' }
]);

const pluginHeaders = computed(() => [
  { title: tm('table.headers.name'), key: 'name', width: '200px' },
  { title: tm('table.headers.description'), key: 'desc', maxWidth: '250px' },
  { title: tm('table.headers.version'), key: 'version', width: '100px' },
  { title: tm('table.headers.author'), key: 'author', width: '100px' },
  { title: tm('table.headers.status'), key: 'activated', width: '100px' },
  { title: tm('table.headers.actions'), key: 'actions', sortable: false, width: '220px' }
]);

const filteredExtensions = computed(() => {
  const data = Array.isArray(extension_data?.data) ? extension_data.data : [];
  if (!showReserved.value) {
    return data.filter(ext => !ext.reserved);
  }
  return data;
});

const filteredPlugins = computed(() => {
  if (!pluginSearch.value) {
    return filteredExtensions.value;
  }

  const search = pluginSearch.value.toLowerCase();
  return filteredExtensions.value.filter(plugin => {
    return plugin.name?.toLowerCase().includes(search) ||
      plugin.desc?.toLowerCase().includes(search) ||
      plugin.author?.toLowerCase().includes(search);
  });
});

const filteredMarketPlugins = computed(() => {
  if (!debouncedMarketSearch.value) {
    return pluginMarketData.value;
  }

  const search = debouncedMarketSearch.value.toLowerCase();
  return pluginMarketData.value.filter(plugin => {
    return marketCustomFilter(plugin.name, search, plugin) ||
      marketCustomFilter(plugin.desc, search, plugin) ||
      marketCustomFilter(plugin.author, search, plugin);
  });
});

const sortedPlugins = computed(() => {
  const plugins = [...filteredMarketPlugins.value];

  if (sortBy.value === 'stars') {
    plugins.sort((a, b) => {
      const starsA = a.stars ?? 0;
      const starsB = b.stars ?? 0;
      return sortOrder.value === 'desc' ? starsB - starsA : starsA - starsB;
    });
  } else if (sortBy.value === 'author') {
    plugins.sort((a, b) => {
      const authorA = (a.author ?? '').toLowerCase();
      const authorB = (b.author ?? '').toLowerCase();
      const result = authorA.localeCompare(authorB);
      return sortOrder.value === 'desc' ? -result : result;
    });
  } else if (sortBy.value === 'updated') {
    plugins.sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB;
    });
  } else {
    const pinned = plugins.filter(plugin => plugin?.pinned);
    const notPinned = plugins.filter(plugin => !plugin?.pinned);
    return [...pinned, ...notPinned];
  }

  return plugins;
});

const totalPages = computed(() => {
  return Math.ceil(sortedPlugins.value.length / displayItemsPerPage);
});

const paginatedPlugins = computed(() => {
  const start = (currentPage.value - 1) * displayItemsPerPage;
  const end = start + displayItemsPerPage;
  return sortedPlugins.value.slice(start, end);
});

const updatableExtensions = computed(() => {
  return extension_data?.data?.filter(ext => ext.has_update) || [];
});

const toggleShowReserved = () => {
  showReserved.value = !showReserved.value;
};

const toast = (message, success) => {
  snack_message.value = message;
  snack_show.value = true;
  snack_success.value = success;
};

const resetLoadingDialog = () => {
  loadingDialog.show = false;
  loadingDialog.title = tm('dialogs.loading.title');
  loadingDialog.statusCode = 0;
  loadingDialog.result = '';
};

const onLoadingDialogResult = (statusCode, result, timeToClose = 2000) => {
  loadingDialog.statusCode = statusCode;
  loadingDialog.result = result;
  if (timeToClose === -1) return;
  setTimeout(resetLoadingDialog, timeToClose);
};

const getExtensions = async () => {
  loading_.value = true;
  try {
    const res = await axios.get('/api/plugin/get');
    Object.assign(extension_data, res.data);
    checkUpdate();
  } catch (err) {
    toast(err, 'error');
  } finally {
    loading_.value = false;
  }
};

const checkUpdate = () => {
  const onlinePluginsMap = new Map();
  const onlinePluginsNameMap = new Map();

  pluginMarketData.value.forEach(plugin => {
    if (plugin.repo) {
      onlinePluginsMap.set(plugin.repo.toLowerCase(), plugin);
    }
    onlinePluginsNameMap.set(plugin.name, plugin);
  });

  const data = Array.isArray(extension_data?.data) ? extension_data.data : [];
  data.forEach(extension => {
    const repoKey = extension.repo?.toLowerCase();
    const onlinePlugin = repoKey ? onlinePluginsMap.get(repoKey) : null;
    const onlinePluginByName = onlinePluginsNameMap.get(extension.name);
    const matchedPlugin = onlinePlugin || onlinePluginByName;

    if (matchedPlugin) {
      extension.online_version = matchedPlugin.version;
      extension.has_update = extension.version !== matchedPlugin.version &&
        matchedPlugin.version !== tm('status.unknown');
    } else {
      extension.has_update = false;
    }
  });
};

const uninstallExtension = async (extension_name, optionsOrSkipConfirm = false) => {
  let deleteConfig = false;
  let deleteData = false;
  let skipConfirm = false;

  if (typeof optionsOrSkipConfirm === 'boolean') {
    skipConfirm = optionsOrSkipConfirm;
  } else if (typeof optionsOrSkipConfirm === 'object' && optionsOrSkipConfirm !== null) {
    deleteConfig = optionsOrSkipConfirm.deleteConfig || false;
    deleteData = optionsOrSkipConfirm.deleteData || false;
    skipConfirm = true;
  }

  if (!skipConfirm) {
    pluginToUninstall.value = extension_name;
    showUninstallDialog.value = true;
    return;
  }

  toast(tm('messages.uninstalling') + ' ' + extension_name, 'primary');
  try {
    const res = await axios.post('/api/plugin/uninstall', {
      name: extension_name,
      delete_config: deleteConfig,
      delete_data: deleteData
    });
    if (res.data.status === 'error') {
      toast(res.data.message, 'error');
      return;
    }
    Object.assign(extension_data, res.data);
    toast(res.data.message, 'success');
    getExtensions();
  } catch (err) {
    toast(err, 'error');
  }
};

const handleUninstall = ({ extension, options }) => {
  if (!extension) return;
  uninstallExtension(extension.name, options ?? false);
};

const handleUninstallConfirm = (options) => {
  if (pluginToUninstall.value) {
    uninstallExtension(pluginToUninstall.value, options);
    pluginToUninstall.value = null;
  }
};

const updateExtension = async (extension_name) => {
  loadingDialog.title = tm('status.loading');
  loadingDialog.show = true;
  try {
    const res = await axios.post('/api/plugin/update', {
      name: extension_name,
      proxy: localStorage.getItem('selectedGitHubProxy') || ''
    });

    if (res.data.status === 'error') {
      onLoadingDialogResult(2, res.data.message, -1);
      return;
    }

    Object.assign(extension_data, res.data);
    onLoadingDialogResult(1, res.data.message);
    setTimeout(async () => {
      toast(tm('messages.refreshing'), 'info', 2000);
      try {
        await getExtensions();
        toast(tm('messages.refreshSuccess'), 'success');
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || String(error);
        toast(`${tm('messages.refreshFailed')}: ${errorMsg}`, 'error');
      }
    }, 1000);
  } catch (err) {
    toast(err, 'error');
  }
};

const updateAllExtensions = async () => {
  if (updatingAll.value || updatableExtensions.value.length === 0) return;
  updatingAll.value = true;
  loadingDialog.title = tm('status.loading');
  loadingDialog.statusCode = 0;
  loadingDialog.result = '';
  loadingDialog.show = true;

  const targets = updatableExtensions.value.map(ext => ext.name);
  try {
    const res = await axios.post('/api/plugin/update-all', {
      names: targets,
      proxy: localStorage.getItem('selectedGitHubProxy') || ''
    });

    if (res.data.status === 'error') {
      onLoadingDialogResult(2, res.data.message || tm('messages.updateAllFailed', {
        failed: targets.length,
        total: targets.length
      }), -1);
      return;
    }

    const results = res.data.data?.results || [];
    const failures = results.filter(r => r.status !== 'ok');
    try {
      await getExtensions();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || String(err);
      failures.push({ name: 'refresh', status: 'error', message: errorMsg });
    }

    if (failures.length === 0) {
      onLoadingDialogResult(1, tm('messages.updateAllSuccess'));
    } else {
      const failureText = tm('messages.updateAllFailed', {
        failed: failures.length,
        total: targets.length
      });
      const detail = failures.map(f => `${f.name}: ${f.message}`).join('\n');
      onLoadingDialogResult(2, `${failureText}\n${detail}`, -1);
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || String(err);
    onLoadingDialogResult(2, errorMsg, -1);
  } finally {
    updatingAll.value = false;
  }
};

const pluginOn = async (extension) => {
  try {
    const res = await axios.post('/api/plugin/on', { name: extension.name });
    if (res.data.status === 'error') {
      toast(res.data.message, 'error');
      return;
    }
    toast(res.data.message, 'success');
    await getExtensions();
    await checkAndPromptConflicts();
  } catch (err) {
    toast(err, 'error');
  }
};

const pluginOff = async (extension) => {
  try {
    const res = await axios.post('/api/plugin/off', { name: extension.name });
    if (res.data.status === 'error') {
      toast(res.data.message, 'error');
      return;
    }
    toast(res.data.message, 'success');
    getExtensions();
  } catch (err) {
    toast(err, 'error');
  }
};

const openExtensionConfig = async (extension_name) => {
  curr_namespace.value = extension_name;
  configDialog.value = true;
  try {
    const res = await axios.get('/api/config/get?plugin_name=' + extension_name);
    extension_config.metadata = res.data.data.metadata;
    extension_config.config = res.data.data.config;
  } catch (err) {
    toast(err, 'error');
  }
};

const updateConfig = async () => {
  try {
    const res = await axios.post('/api/config/plugin/update?plugin_name=' + curr_namespace.value, extension_config.config);
    if (res.data.status === 'ok') {
      toast(res.data.message, 'success');
    } else {
      toast(res.data.message, 'error');
    }
    configDialog.value = false;
    extension_config.metadata = {};
    extension_config.config = {};
    getExtensions();
  } catch (err) {
    toast(err, 'error');
  }
};

const showPluginInfo = (plugin) => {
  selectedPlugin.value = plugin;
  showPluginInfoDialog.value = true;
};

const reloadPlugin = async (plugin_name) => {
  try {
    const res = await axios.post('/api/plugin/reload', { name: plugin_name });
    if (res.data.status === 'error') {
      toast(res.data.message, 'error');
      return;
    }
    toast(tm('messages.reloadSuccess'), 'success');
    getExtensions();
  } catch (err) {
    toast(err, 'error');
  }
};

const viewReadme = (plugin) => {
  readmeDialog.pluginName = plugin.name;
  readmeDialog.repoUrl = plugin.repo;
  readmeDialog.show = true;
};

const handleInstallPlugin = async (plugin) => {
  if (plugin.tags && plugin.tags.includes('danger')) {
    selectedDangerPlugin.value = plugin;
    dangerConfirmDialog.value = true;
  } else {
    extension_url.value = plugin.repo;
    dialog.value = true;
    uploadTab.value = 'url';
  }
};

const confirmDangerInstall = () => {
  if (selectedDangerPlugin.value) {
    extension_url.value = selectedDangerPlugin.value.repo;
    dialog.value = true;
    uploadTab.value = 'url';
  }
  dangerConfirmDialog.value = false;
  selectedDangerPlugin.value = null;
};

const cancelDangerInstall = () => {
  dangerConfirmDialog.value = false;
  selectedDangerPlugin.value = null;
};

const loadCustomSources = async () => {
  try {
    const res = await axios.get('/api/plugin/source/get');
    if (res.data.status === 'ok') {
      customSources.value = res.data.data;
    } else {
      toast(res.data.message, 'error');
    }
  } catch (e) {
    console.warn('Failed to load custom sources:', e);
    customSources.value = [];
  }

  const currentSource = localStorage.getItem('selectedPluginSource');
  if (currentSource) {
    selectedSource.value = currentSource;
  }
};

const saveCustomSources = async () => {
  try {
    const res = await axios.post('/api/plugin/source/save', {
      sources: customSources.value
    });
    if (res.data.status !== 'ok') {
      toast(res.data.message, 'error');
    }
  } catch (e) {
    toast(e, 'error');
  }
};

const addCustomSource = () => {
  editingSource.value = false;
  originalSourceUrl.value = '';
  sourceName.value = '';
  sourceUrl.value = '';
  showSourceDialog.value = true;
};

const selectPluginSource = (sourceUrl) => {
  selectedSource.value = sourceUrl;
  if (sourceUrl) {
    localStorage.setItem('selectedPluginSource', sourceUrl);
  } else {
    localStorage.removeItem('selectedPluginSource');
  }
  refreshPluginMarket();
};

const selectedSourceObj = computed(() => {
  if (!selectedSource.value) return null;
  return customSources.value.find(s => s.url === selectedSource.value) || null;
});

const editCustomSource = (source) => {
  if (!source) return;
  editingSource.value = true;
  originalSourceUrl.value = source.url;
  sourceName.value = source.name;
  sourceUrl.value = source.url;
  showSourceDialog.value = true;
};

const removeCustomSource = (source) => {
  if (!source) return;
  sourceToRemove.value = source;
  showRemoveSourceDialog.value = true;
};

const confirmRemoveSource = () => {
  if (sourceToRemove.value) {
    customSources.value = customSources.value.filter(s => s.url !== sourceToRemove.value.url);
    saveCustomSources();

    if (selectedSource.value === sourceToRemove.value.url) {
      selectedSource.value = null;
      localStorage.removeItem('selectedPluginSource');
      refreshPluginMarket();
    }

    toast(tm('market.sourceRemoved'), 'success');
    showRemoveSourceDialog.value = false;
    sourceToRemove.value = null;
  }
};

const saveCustomSource = () => {
  const normalizedUrl = sourceUrl.value.trim();

  if (!sourceName.value.trim() || !normalizedUrl) {
    toast(tm('messages.fillSourceNameAndUrl'), 'error');
    return;
  }

  try {
    new URL(normalizedUrl);
  } catch (e) {
    toast(tm('messages.invalidUrl'), 'error');
    return;
  }

  if (editingSource.value) {
    const index = customSources.value.findIndex(s => s.url === originalSourceUrl.value);
    if (index !== -1) {
      customSources.value[index] = {
        name: sourceName.value.trim(),
        url: normalizedUrl
      };

      if (selectedSource.value === originalSourceUrl.value) {
        selectedSource.value = normalizedUrl;
        localStorage.setItem('selectedPluginSource', selectedSource.value);
        refreshPluginMarket();
      }
    }
  } else {
    if (customSources.value.some(source => source.url === normalizedUrl)) {
      toast(tm('market.sourceExists'), 'error');
      return;
    }

    customSources.value.push({
      name: sourceName.value.trim(),
      url: normalizedUrl
    });
  }

  saveCustomSources();
  toast(editingSource.value ? tm('market.sourceUpdated') : tm('market.sourceAdded'), 'success');

  sourceName.value = '';
  sourceUrl.value = '';
  editingSource.value = false;
  originalSourceUrl.value = '';
  showSourceDialog.value = false;
};

const trimExtensionName = () => {
  pluginMarketData.value.forEach(plugin => {
    if (plugin.name) {
      const name = plugin.name.trim().toLowerCase();
      if (name.startsWith('astrbot_plugin_')) {
        plugin.trimmedName = name.substring(15);
      } else if (name.startsWith('astrbot_') || name.startsWith('astrbot-')) {
        plugin.trimmedName = name.substring(8);
      } else {
        plugin.trimmedName = plugin.name;
      }
    }
  });
};

const checkAlreadyInstalled = () => {
  const data = Array.isArray(extension_data?.data) ? extension_data.data : [];
  const installedRepos = new Set(data.map(ext => ext.repo?.toLowerCase()));
  const installedNames = new Set(data.map(ext => ext.name));

  for (let i = 0; i < pluginMarketData.value.length; i++) {
    const plugin = pluginMarketData.value[i];
    plugin.installed = installedRepos.has(plugin.repo?.toLowerCase()) || installedNames.has(plugin.name);
  }

  const installed = [];
  const notInstalled = [];
  for (let i = 0; i < pluginMarketData.value.length; i++) {
    if (pluginMarketData.value[i].installed) {
      installed.push(pluginMarketData.value[i]);
    } else {
      notInstalled.push(pluginMarketData.value[i]);
    }
  }
  pluginMarketData.value = notInstalled.concat(installed);
};

const newExtension = async () => {
  if (extension_url.value === '' && upload_file.value === null) {
    toast(tm('messages.fillUrlOrFile'), 'error');
    return;
  }

  if (extension_url.value !== '' && upload_file.value !== null) {
    toast(tm('messages.dontFillBoth'), 'error');
    return;
  }
  loading_.value = true;
  loadingDialog.title = tm('status.loading');
  loadingDialog.show = true;
  if (upload_file.value !== null) {
    toast(tm('messages.installing'), 'primary');
    const formData = new FormData();
    formData.append('file', upload_file.value);
    axios.post('/api/plugin/install-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(async (res) => {
      loading_.value = false;
      if (res.data.status === 'error') {
        onLoadingDialogResult(2, res.data.message, -1);
        return;
      }
      upload_file.value = null;
      onLoadingDialogResult(1, res.data.message);
      dialog.value = false;
      await getExtensions();

      viewReadme({
        name: res.data.data.name,
        repo: res.data.data.repo || null
      });
      
      await checkAndPromptConflicts();
    }).catch((err) => {
      loading_.value = false;
      onLoadingDialogResult(2, err, -1);
    });
  } else {
    toast(tm('messages.installingFromUrl') + ' ' + extension_url.value, 'primary');
    axios.post('/api/plugin/install',
      {
        url: extension_url.value,
        proxy: localStorage.getItem('selectedGitHubProxy') || ''
      }).then(async (res) => {
        loading_.value = false;
        toast(res.data.message, res.data.status === 'ok' ? 'success' : 'error');
        if (res.data.status === 'error') {
          onLoadingDialogResult(2, res.data.message, -1);
          return;
        }
        extension_url.value = '';
        onLoadingDialogResult(1, res.data.message);
        dialog.value = false;
        await getExtensions();

        viewReadme({
          name: res.data.data.name,
          repo: res.data.data.repo || null
        });
        
        await checkAndPromptConflicts();
      }).catch((err) => {
        loading_.value = false;
        toast(tm('messages.installFailed') + ' ' + err, 'error');
        onLoadingDialogResult(2, err, -1);
      });
  }
};

const refreshPluginMarket = async () => {
  refreshingMarket.value = true;
  try {
    const data = await commonStore.getPluginCollections(true, selectedSource.value);
    pluginMarketData.value = data;
    trimExtensionName();
    checkAlreadyInstalled();
    checkUpdate();
    currentPage.value = 1;

    toast(tm('messages.refreshSuccess'), 'success');
  } catch (err) {
    toast(tm('messages.refreshFailed') + ' ' + err, 'error');
  } finally {
    refreshingMarket.value = false;
  }
};

onMounted(async () => {
  await getExtensions();

  loadCustomSources();

  let urlParams;
  if (window.location.hash) {
    const hashQuery = window.location.hash.split('?')[1] || '';
    urlParams = new URLSearchParams(hashQuery);
  } else {
    urlParams = new URLSearchParams(window.location.search);
  }
  const plugin_name = urlParams.get('open_config');
  if (plugin_name) {
    openExtensionConfig(plugin_name);
  }

  try {
    const data = await commonStore.getPluginCollections(false, selectedSource.value);
    pluginMarketData.value = data;
    trimExtensionName();
    checkAlreadyInstalled();
    checkUpdate();
  } catch (err) {
    toast(tm('messages.getMarketDataFailed') + ' ' + err, 'error');
  }
});

let searchDebounceTimer = null;
watch(marketSearch, (newVal) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    debouncedMarketSearch.value = newVal;
    currentPage.value = 1;
  }, 300);
});

</script>

<template>
  <v-row>
    <v-col cols="12" md="12">
      <v-card variant="flat" style="background-color: transparent">
        <!-- 标签页 -->
        <v-card-text style="padding: 0px 12px;">
          <!-- 标签栏和搜索栏 - 响应式布局 -->
          <div class="mb-4 d-flex flex-wrap">
            <!-- 标签栏 -->
            <v-tabs v-model="activeTab" color="primary">
              <v-tab value="installed">
                <v-icon class="mr-2">mdi-puzzle</v-icon>
                {{ tm('tabs.installedPlugins') }}
              </v-tab>
              <v-tab value="mcp">
                <v-icon class="mr-2">mdi-server-network</v-icon>
                {{ tm('tabs.installedMcpServers') }}
              </v-tab>
              <v-tab value="market">
                <v-icon class="mr-2">mdi-store</v-icon>
                {{ tm('tabs.market') }}
              </v-tab>
              <v-tab value="components">
                <v-icon class="mr-2">mdi-wrench</v-icon>
                {{ tm('tabs.handlersOperation') }}
              </v-tab>
            </v-tabs>

            <!-- 搜索栏 - 在移动端时独占一行 -->
            <div style="flex-grow: 1; min-width: 250px; max-width: 400px; margin-left: auto; margin-top: 8px;">
              <v-text-field v-if="activeTab === 'market'" v-model="marketSearch" density="compact"
                :label="tm('search.marketPlaceholder')" prepend-inner-icon="mdi-magnify" variant="solo-filled" flat
                hide-details single-line>
              </v-text-field>
              <v-text-field v-else-if="activeTab === 'installed'" v-model="pluginSearch" density="compact" :label="tm('search.placeholder')"
                prepend-inner-icon="mdi-magnify" variant="solo-filled" flat hide-details single-line>
              </v-text-field>
            </div>

          </div>


          <!-- 已安装插件标签页内容 -->
          <div v-show="activeTab === 'installed'">
            <InstalledExtensionsSection
              v-model:isListView="isListView"
              :filtered-plugins="filteredPlugins"
              :loading="loading_"
              :plugin-headers="pluginHeaders"
              :show-reserved="showReserved"
              :updatable-extensions="updatableExtensions"
              :updating-all="updatingAll"
              :extension-message="extension_data.message"
              @toggle-show-reserved="toggleShowReserved"
              @update-all="updateAllExtensions"
              @open-install-dialog="dialog = true"
              @plugin-on="pluginOn"
              @plugin-off="pluginOff"
              @reload="reloadPlugin"
              @open-config="openExtensionConfig"
              @show-info="showPluginInfo"
              @view-readme="viewReadme"
              @update-extension="updateExtension"
              @uninstall="handleUninstall"
            />
          </div>

          <!-- 指令面板标签页内容 -->
          <v-tab-item v-show="activeTab === 'components'">
            <v-card class="rounded-lg" variant="flat" style="background-color: transparent;">
              <v-card-text class="pa-0">
                <ComponentPanel :active="activeTab === 'components'" />
              </v-card-text>
            </v-card>
          </v-tab-item>

          <!-- 已安装的 MCP 服务器标签页内容 -->
          <v-tab-item v-show="activeTab === 'mcp'">
            <v-card class="rounded-lg" variant="flat" style="background-color: transparent;">
              <v-card-text class="pa-0">
                <McpServersSection />
              </v-card-text>
            </v-card>
          </v-tab-item>

          <!-- 插件市场标签页内容 -->
          <div v-show="activeTab === 'market'">
            <MarketExtensionsSection
              :filtered-market-plugins="filteredMarketPlugins"
              :paginated-plugins="paginatedPlugins"
              :current-page="currentPage"
              :total-pages="totalPages"
              :sort-by="sortBy"
              :sort-order="sortOrder"
              :sort-options="sortOptions"
              :refreshing-market="refreshingMarket"
              :custom-sources="customSources"
              :selected-source="selectedSource"
              :selected-source-obj="selectedSourceObj"
              :show-plugin-full-name="showPluginFullName"
              @update:currentPage="currentPage = $event"
              @update:sortBy="sortBy = $event"
              @update:sortOrder="sortOrder = $event"
              @refresh="refreshPluginMarket"
              @handle-install-plugin="handleInstallPlugin"
              @open-install-dialog="dialog = true"
              @select-plugin-source="selectPluginSource"
              @add-custom-source="addCustomSource"
              @edit-custom-source="editCustomSource"
              @remove-custom-source="removeCustomSource"
            />
          </div>

          <v-row v-if="loading_">
            <v-col cols="12" class="d-flex justify-center">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col v-if="activeTab === 'market'" cols="12" md="12">
      <div class="d-flex align-center justify-center mt-4 mb-4 gap-4">
        <v-btn
          variant="text"
          prepend-icon="mdi-book-open-variant"
          href="https://docs.astrbot.app/dev/plugin.html"
          target="_blank"
          color="primary"
          class="text-none"
        >
          {{ tm('market.devDocs') }}
        </v-btn>
        <div style="height: 24px; width: 1px; background-color: rgba(var(--v-theme-on-surface), 0.12);"></div>
        <v-btn
          variant="text"
          prepend-icon="mdi-github"
          href="https://github.com/AstrBotDevs/AstrBot_Plugins_Collection"
          target="_blank"
          color="primary"
          class="text-none"
        >
          {{ tm('market.submitRepo') }}
        </v-btn>
      </div>
    </v-col>
  </v-row>

  <!-- 配置对话框 -->
  <v-dialog v-model="configDialog" width="1000">
    <v-card>
      <v-card-title class="text-h5">{{ tm('dialogs.config.title') }}</v-card-title>
      <v-card-text>
        <AstrBotConfig v-if="extension_config.metadata" :metadata="extension_config.metadata"
          :iterable="extension_config.config" :metadataKey="curr_namespace" />
        <p v-else>{{ tm('dialogs.config.noConfig') }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="updateConfig">{{ tm('buttons.saveAndClose') }}</v-btn>
        <v-btn color="blue-darken-1" variant="text" @click="configDialog = false">{{ tm('buttons.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 加载对话框 -->
  <v-dialog v-model="loadingDialog.show" width="700" persistent>
    <v-card>
      <v-card-title class="text-h5">{{ loadingDialog.title }}</v-card-title>
      <v-card-text style="max-height: calc(100vh - 200px); overflow-y: auto;">
        <v-progress-linear v-if="loadingDialog.statusCode === 0" indeterminate color="primary"
          class="mb-4"></v-progress-linear>

        <div v-if="loadingDialog.statusCode !== 0" class="py-8 text-center">
          <v-icon class="mb-6" :color="loadingDialog.statusCode === 1 ? 'success' : 'error'"
            :icon="loadingDialog.statusCode === 1 ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'"
            size="128"></v-icon>
          <div class="text-h4 font-weight-bold">{{ loadingDialog.result }}</div>
        </div>

        <div style="margin-top: 32px;">
          <h3>{{ tm('dialogs.loading.logs') }}</h3>
          <ConsoleDisplayer historyNum="10" style="height: 200px; margin-top: 16px; margin-bottom: 24px;">
          </ConsoleDisplayer>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="resetLoadingDialog">{{ tm('buttons.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 插件信息对话框 -->
  <v-dialog v-model="showPluginInfoDialog" width="1200">
    <v-card>
      <v-card-title class="text-h5">{{ selectedPlugin.name }} {{ tm('buttons.viewInfo') }}</v-card-title>
      <v-card-text>
        <v-data-table style="font-size: 17px;" :headers="plugin_handler_info_headers" :items="selectedPlugin.handlers"
          item-key="name">
          <template v-slot:header.id="{ column }">
            <p style="font-weight: bold;">{{ column.title }}</p>
          </template>
          <template v-slot:item.event_type="{ item }">
            {{ item.event_type }}
          </template>
          <template v-slot:item.desc="{ item }">
            {{ item.desc }}
          </template>
          <template v-slot:item.type="{ item }">
            <v-chip color="success">
              {{ item.type }}
            </v-chip>
          </template>
          <template v-slot:item.cmd="{ item }">
            <span style="font-weight: bold;">{{ item.cmd }}</span>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="showPluginInfoDialog = false">{{ tm('buttons.close')
          }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar :timeout="2000" elevation="24" :color="snack_success" v-model="snack_show">
    {{ snack_message }}
  </v-snackbar>

  <ReadmeDialog v-model:show="readmeDialog.show" :plugin-name="readmeDialog.pluginName"
    :repo-url="readmeDialog.repoUrl" />

  <!-- 卸载插件确认对话框（列表模式用） -->
  <UninstallConfirmDialog v-model="showUninstallDialog" @confirm="handleUninstallConfirm" />

  <!-- 指令冲突提示对话框 -->
  <v-dialog v-model="conflictDialog.show" max-width="420">
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center pa-4">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('conflicts.title') }}
      </v-card-title>
      <v-card-text class="px-4 pb-2">
        <div class="d-flex align-center mb-3">
          <v-chip color="warning" variant="tonal" size="large" class="font-weight-bold">
            {{ conflictDialog.count }}
          </v-chip>
          <span class="ml-2 text-body-1">{{ tm('conflicts.pairs') }}</span>
        </div>
        <p class="text-body-2" style="color: rgba(var(--v-theme-on-surface), 0.7);">
          {{ tm('conflicts.message') }}
        </p>
      </v-card-text>
      <v-card-actions class="pa-4 pt-2">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="conflictDialog.show = false">{{ tm('conflicts.later') }}</v-btn>
        <v-btn color="warning" variant="flat" @click="handleConflictConfirm">
          {{ tm('conflicts.goToManage') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 危险插件确认对话框 -->
  <v-dialog v-model="dangerConfirmDialog" width="500" persistent>
    <v-card>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('dialogs.danger_warning.title') }}
      </v-card-title>
      <v-card-text>
        <div>{{ tm('dialogs.danger_warning.message') }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" @click="cancelDangerInstall">
          {{ tm('dialogs.danger_warning.cancel') }}
        </v-btn>
        <v-btn color="warning" @click="confirmDangerInstall">
          {{ tm('dialogs.danger_warning.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 上传插件对话框 -->
  <v-dialog v-model="dialog" width="500">

    <v-card :loading="loading_" class="rounded-lg" elevation="2">
      <template #loader>
        <v-progress-linear :indeterminate="loading_" color="primary" height="2"></v-progress-linear>
      </template>

      <v-card-title class="text-h5">{{ tm('dialogs.install.title') }}</v-card-title>

      <v-card-text>
        <v-tabs v-model="uploadTab" color="primary">
          <v-tab value="file">{{ tm('dialogs.install.fromFile') }}</v-tab>
          <v-tab value="url">{{ tm('dialogs.install.fromUrl') }}</v-tab>
        </v-tabs>

        <v-window v-model="uploadTab" class="mt-4">
          <v-window-item value="file">
            <div class="d-flex flex-column align-center justify-center pa-4">
              <v-file-input ref="fileInput" v-model="upload_file" :label="tm('upload.selectFile')" accept=".zip"
                hide-details hide-input class="d-none"></v-file-input>

              <v-btn color="primary" size="large" prepend-icon="mdi-upload" @click="$refs.fileInput.click()" elevation="2">
                {{ tm('buttons.selectFile') }}
              </v-btn>

              <div class="text-body-2 text-medium-emphasis mt-2">
                {{ tm('messages.supportedFormats') }}
              </div>

              <div v-if="upload_file" class="mt-4 text-center">
                <v-chip color="primary" size="large" closable @click:close="upload_file = null">
                  {{ upload_file.name }}
                  <template v-slot:append>
                    <span class="text-caption ml-2">({{ (upload_file.size / 1024).toFixed(1) }}KB)</span>
                  </template>
                </v-chip>
              </div>
            </div>
          </v-window-item>

          <v-window-item value="url">
            <div class="pa-4">
              <v-text-field v-model="extension_url" :label="tm('upload.enterUrl')" variant="outlined"
                prepend-inner-icon="mdi-link" hide-details class="rounded-lg mb-4"
                placeholder="https://github.com/username/repo"></v-text-field>

              <ProxySelector></ProxySelector>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="dialog = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="primary" variant="text" @click="newExtension">{{ tm('buttons.install') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 添加/编辑自定义插件源对话框 -->
  <v-dialog v-model="showSourceDialog" width="500">
    <v-card>
      <v-card-title class="text-h5">{{ editingSource ? tm('market.editSource') : tm('market.addSource') }}</v-card-title>
      <v-card-text>
        <div class="pa-2">
          <v-text-field
            v-model="sourceName"
            :label="tm('market.sourceName')"
            variant="outlined"
            prepend-inner-icon="mdi-rename-box"
            hide-details
            class="mb-4"
            placeholder="我的插件源"
          ></v-text-field>
          
          <v-text-field
            v-model="sourceUrl"
            :label="tm('market.sourceUrl')"
            variant="outlined"
            prepend-inner-icon="mdi-link"
            hide-details
            placeholder="https://example.com/plugins.json"
          ></v-text-field>
          
          <div class="text-caption text-medium-emphasis mt-2">
            {{ tm('messages.enterJsonUrl') }}
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="showSourceDialog = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="primary" variant="text" @click="saveCustomSource">{{ tm('buttons.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 删除插件源确认对话框 -->
  <v-dialog v-model="showRemoveSourceDialog" width="400">
    <v-card>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('dialogs.uninstall.title') }}
      </v-card-title>
      <v-card-text>
        <div>{{ tm('market.confirmRemoveSource') }}</div>
        <div v-if="sourceToRemove" class="mt-2">
          <strong>{{ sourceToRemove.name }}</strong>
          <div class="text-caption">{{ sourceToRemove.url }}</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="showRemoveSourceDialog = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="error" variant="text" @click="confirmRemoveSource">{{ tm('buttons.deleteSource') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.plugin-handler-item {
  margin-bottom: 10px;
  padding: 5px;
  border-radius: 5px;
  background-color: #f5f5f5;
}

.plugin-description {
  color: rgba(var(--v-theme-on-surface), 0.6);
  line-height: 1.3;
  margin-bottom: 6px;
  flex: 1;
  overflow-y: hidden;
}

.plugin-card:hover .plugin-description {
  overflow-y: auto;
}

.plugin-description::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.plugin-description::-webkit-scrollbar-track {
  background: transparent;
}

.plugin-description::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-primary-rgb), 0.4);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.plugin-description::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-primary-rgb), 0.6);
}
</style>
