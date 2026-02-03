<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { ref, computed } from 'vue'
import ConfigItemRenderer from './ConfigItemRenderer.vue'
import TemplateListEditor from './TemplateListEditor.vue'
import { useI18n, useModuleI18n } from '@/i18n/composables'

type AnyRecord = Record<string, any>

const props = defineProps({
  metadata: {
    type: Object,
    required: true
  },
  iterable: {
    type: Object,
    required: true
  },
  metadataKey: {
    type: String,
    required: true
  }
})

const { t } = useI18n()
const { tm } = useModuleI18n('features/config-metadata')

// 翻译器函数 - 如果是国际化键则翻译，否则原样返回
const translateIfKey = (value: unknown): unknown => {
  if (!value || typeof value !== 'string') return value

  const trimmed = value.trim()
  if (!trimmed) return value

  // Only translate values that look like i18n keys (avoid translating plain text)
  const looksLikeI18nKey = /^[\w-]+(\.[\w-]+)+$/.test(trimmed)
  if (!looksLikeI18nKey) return value

  // Some metadata already provides absolute keys like `features.config-metadata.xxx`
  if (trimmed.startsWith('core.') || trimmed.startsWith('features.') || trimmed.startsWith('messages.')) {
    return t(trimmed)
  }

  return tm(trimmed)
}

const dialog = ref(false)
const currentEditingKey = ref('')
const currentEditingLanguage = ref('json')
const currentEditingTheme = ref('vs-light')
let currentEditingKeyIterable: AnyRecord = {}

function getValueBySelector(obj: unknown, selector: string): unknown {
  const keys = selector.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as AnyRecord)) {
      current = (current as AnyRecord)[key]
    } else {
      return undefined
    }
  }
  return current
}

function setValueBySelector(obj: AnyRecord, selector: string, value: unknown) {
  const keys = selector.split('.')
  let current: AnyRecord = obj

  // 创建嵌套对象路径
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  // 设置最终值
  current[keys[keys.length - 1]] = value
}

// 创建一个计算属性来处理 JSON selector 的获取和设置
function createSelectorModel(selector: string) {
  return computed<any>({
    get() {
      return getValueBySelector(props.iterable, selector)
    },
    set(value) {
      setValueBySelector(props.iterable as AnyRecord, selector, value)
    }
  })
}

function openEditorDialog(key: string, value: unknown, theme?: string, language?: string) {
  currentEditingKey.value = key
  currentEditingLanguage.value = language || 'json'
  currentEditingTheme.value = theme || 'vs-light'
  currentEditingKeyIterable = value && typeof value === 'object' ? (value as AnyRecord) : {}
  dialog.value = true
}

function saveEditedContent() {
  dialog.value = false
}

function shouldShowItem(itemMeta: unknown, _itemKey: string) {
  const meta = itemMeta as AnyRecord | null | undefined
  if (!meta?.condition) {
    return true
  }
  for (const [conditionKey, expectedValue] of Object.entries(meta.condition)) {
    const actualValue = getValueBySelector(props.iterable, conditionKey)
    if (actualValue !== expectedValue) {
      return false
    }
  }
  return true
}

// 检查最外层的 object 是否应该显示
function shouldShowSection() {
  const sectionMeta = props.metadata[props.metadataKey]
  if (!sectionMeta?.condition) {
    return true
  }
  for (const [conditionKey, expectedValue] of Object.entries(sectionMeta.condition)) {
    const actualValue = getValueBySelector(props.iterable, conditionKey)
    if (actualValue !== expectedValue) {
      return false
    }
  }
  return true
}

function hasVisibleItemsAfter(items: Record<string, unknown>, currentIndex: number) {
  const itemEntries = Object.entries(items)

  // 检查当前索引之后是否还有可见的配置项
  for (let i = currentIndex + 1; i < itemEntries.length; i++) {
    const [itemKey, itemMeta] = itemEntries[i]
    if (shouldShowItem(itemMeta, itemKey)) {
      return true
    }
  }

  return false
}

</script>

<template>
  <div class="astrbot-config-v4">
    <v-card
      v-if="shouldShowSection()"
      style="margin-bottom: 16px; padding-bottom: 8px; background-color: rgb(var(--v-theme-background));"
      rounded="md"
      variant="outlined"
    >
      <v-card-text
        v-if="metadata[metadataKey]?.type === 'object'"
        class="config-section"
        style="padding-bottom: 8px;"
      >
        <v-list-item-title class="config-title">
          {{ translateIfKey(metadata[metadataKey]?.description) }}
        </v-list-item-title>
        <v-list-item-subtitle class="config-hint">
          <span
            v-if="metadata[metadataKey]?.obvious_hint && metadata[metadataKey]?.hint"
            class="important-hint"
          >‼️</span>
          {{ translateIfKey(metadata[metadataKey]?.hint) }}
        </v-list-item-subtitle>
      </v-card-text>

      <!-- Object Type Configuration with JSON Selector Support -->
      <div
        v-if="metadata[metadataKey]?.type === 'object'"
        class="object-config"
      >
        <div
          v-for="(itemMeta, itemKey, index) in (metadata[metadataKey].items as Record<string, any>)"
          :key="itemKey"
          class="config-item"
        >
          <!-- Check if itemKey is a JSON selector -->
          <template v-if="shouldShowItem(itemMeta, itemKey)">
            <!-- JSON Selector Property -->
            <v-row
              v-if="!itemMeta?.invisible"
              class="config-row"
            >
              <v-col
                cols="12"
                sm="6"
                class="property-info"
              >
                <v-list-item density="compact">
                  <v-list-item-title class="property-name">
                    {{ translateIfKey(itemMeta?.description) || itemKey }}
                    <span class="property-key">({{ itemKey }})</span>
                  </v-list-item-title>

                  <v-list-item-subtitle class="property-hint">
                    <span
                      v-if="itemMeta?.obvious_hint && itemMeta?.hint"
                      class="important-hint"
                    >‼️</span>
                    {{ translateIfKey(itemMeta?.hint) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-col>
              <v-col
                cols="12"
                sm="6"
                class="config-input"
              >
                <TemplateListEditor
                  v-if="itemMeta?.type === 'template_list'"
                  v-model="createSelectorModel(itemKey).value"
                  :templates="itemMeta?.templates || {}"
                  class="config-field"
                />
                <ConfigItemRenderer
                  v-else
                  v-model="createSelectorModel(itemKey).value"
                  :item-meta="itemMeta || null"
                  :show-fullscreen-btn="!!itemMeta?.editor_mode"
                  @open-fullscreen="openEditorDialog(itemKey, iterable, itemMeta?.editor_theme, itemMeta?.editor_language)"
                />
              </v-col>
            </v-row>

            <!-- Plugin Set Selector 全宽显示区域 -->
            <v-row
              v-if="!itemMeta?.invisible && itemMeta?._special === 'select_plugin_set'"
              class="plugin-set-display-row"
            >
              <v-col
                cols="12"
                class="plugin-set-display"
              >
                <div
                  v-if="createSelectorModel(itemKey).value && createSelectorModel(itemKey).value.length > 0"
                  class="selected-plugins-full-width"
                >
                  <div class="plugins-header">
                    <small class="text-grey">{{ t('core.shared.pluginSetSelector.selectedPluginsLabel') }}</small>
                  </div>
                  <div class="d-flex flex-wrap ga-2 mt-2">
                    <v-chip
                      v-for="plugin in (createSelectorModel(itemKey).value || [])"
                      :key="plugin"
                      size="small"
                      label
                      color="primary"
                      variant="outlined"
                    >
                      {{ plugin === '*' ? t('core.shared.pluginSetSelector.allPluginsLabel') : plugin }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
            </v-row>
          </template>
          <v-divider
            v-if="shouldShowItem(itemMeta, itemKey) && hasVisibleItemsAfter(metadata[metadataKey].items, index)"
            class="config-divider"
          />
        </div>
      </div>
    </v-card>

    <!-- Full Screen Editor Dialog -->
    <v-dialog
      v-model="dialog"
      fullscreen
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card>
        <v-toolbar
          color="primary"
          dark
        >
          <v-btn
            icon
            @click="dialog = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ t('core.common.editor.editingTitle') }} - {{ currentEditingKey }}</v-toolbar-title>
          <v-spacer />
          <v-toolbar-items>
            <v-btn
              variant="text"
              @click="saveEditedContent"
            >
              {{ t('core.common.save') }}
            </v-btn>
          </v-toolbar-items>
        </v-toolbar>
        <v-card-text class="pa-0">
          <VueMonacoEditor
            v-model:value="currentEditingKeyIterable[currentEditingKey]"
            :theme="currentEditingTheme"
            :language="currentEditingLanguage"
            style="height: calc(100vh - 64px);"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>



<style scoped>
.astrbot-config-v4 {
  display: contents;
}

.config-section {
  margin-bottom: 4px;
}

.config-title {
  /* font-weight: 600; */
  font-size: 1.3rem;
  color: var(--v-theme-primaryText);
}

.config-hint {
  font-size: 0.75rem;
  color: var(--v-theme-secondaryText);
  margin-top: 2px;
}

.metadata-key,
.property-key {
  font-size: 0.85em;
  opacity: 0.7;
  font-weight: normal;
  display: none;
}

.important-hint {
  opacity: 1;
  margin-right: 4px;
}

.object-config,
.simple-config {
  width: 100%;
}

.nested-object {
  padding-left: 16px;
}

.nested-container {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  background-color: rgba(0, 0, 0, 0.02);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.config-row {
  margin: 0;
  align-items: center;
  padding: 8px 8px;
  border-radius: 4px;
}

.config-row:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.property-info {
  padding: 0;
}

.property-name {
  font-size: 0.875rem;
  /* font-weight: 600; */
  color: var(--v-theme-primaryText);
}

.property-hint {
  font-size: 0.75rem;
  color: var(--v-theme-secondaryText);
  margin-top: 2px;
}

.type-indicator {
  display: flex;
  justify-content: center;
}

.config-input {
  padding: 4px 8px;
}

.config-field {
  margin-bottom: 0;
}

.config-divider {
  border-color: rgba(0, 0, 0, 0.1);
  margin-left: 24px;
}

.editor-container {
  position: relative;
  display: flex;
  width: 100%;
}

.editor-fullscreen-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.editor-fullscreen-btn:hover {
  background-color: rgba(0, 0, 0, 0.5);
}

.plugin-set-display-row {
  margin: 16px;
  margin-top: 0;
}

.plugin-set-display {
  padding: 0 8px;
}

.selected-plugins-full-width {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
  padding: 12px;
}

.plugins-header {
  margin-bottom: 4px;
}

@media (max-width: 600px) {
  .nested-object {
    padding-left: 8px;
  }

  .config-row {
    padding: 8px 0;
  }

  .property-info,
  .type-indicator,
  .config-input {
    padding: 4px;
  }
}
</style>
