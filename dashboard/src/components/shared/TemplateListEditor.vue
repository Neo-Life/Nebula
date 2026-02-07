<template>
  <div class="template-list-editor">
    <div class="top-bar d-flex align-center justify-end mb-3">
      <v-menu transition="fade-transition">
        <template #activator="{ props: menuProps }">
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            v-bind="menuProps"
            prepend-icon="mdi-plus"
          >
            {{ addButtonText }}
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="option in templateOptions"
            :key="option.value"
            @click="addEntry(option.value)"
          >
            <v-list-item-title>{{ option.label }}</v-list-item-title>
            <v-list-item-subtitle v-if="option.hint">
              {{ option.hint }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <v-alert
      v-if="!modelValue || modelValue.length === 0"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      {{ emptyHintText }}
    </v-alert>

    <v-card
      v-for="(entry, entryIndex) in modelValue"
      :key="entryIndex"
      variant="outlined"
      class="mb-3"
    >
      <v-card-title
        class="d-flex align-center justify-space-between entry-header"
        @click="toggleEntry(entryIndex)"
      >
        <div class="d-flex align-center ga-2">
          <v-btn
            icon
            size="small"
            variant="text"
            :title="
              expandedEntries[entryIndex]
                ? t('core.common.collapse') || '收起'
                : t('core.common.expand') || '展开'
            "
          >
            <v-icon>{{
              expandedEntries[entryIndex]
                ? 'mdi-chevron-down'
                : 'mdi-chevron-right'
            }}</v-icon>
          </v-btn>
          <div class="d-flex flex-column">
            <v-list-item-title class="property-name">
              {{ templateLabel(entry.__template_key) }}
            </v-list-item-title>
            <v-list-item-subtitle
              v-if="getTemplate(entry)?.hint || getTemplate(entry)?.description"
              class="property-hint"
            >
              {{ getTemplate(entry)?.hint || getTemplate(entry)?.description }}
            </v-list-item-subtitle>
          </div>
        </div>
        <div class="d-flex align-center ga-1">
          <v-btn
            icon
            size="small"
            variant="text"
            color="error"
            @click.stop="removeEntry(entryIndex)"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </div>
      </v-card-title>
      <v-expand-transition>
        <v-card-text v-show="expandedEntries[entryIndex]" class="px-0 py-1">
          <div v-if="!getTemplate(entry)" class="px-4 py-2">
            <v-alert type="error" variant="tonal" density="compact">
              {{
                t('core.common.templateList.missingTemplate') ||
                '找不到对应模板，请删除后重新添加。'
              }}
            </v-alert>
          </div>
          <div v-else class="template-entry-body">
            <template
              v-for="(itemMeta, itemKey, metaIndex) in templateItems(entry)"
              :key="itemKey"
            >
              <!-- Nested Object -->
              <div
                v-if="
                  itemMeta?.type === 'object' &&
                  !itemMeta?.invisible &&
                  shouldShowItem(itemMeta, entry)
                "
                class="nested-container mx-4"
              >
                <div class="config-section mb-2">
                  <v-list-item-title class="config-title">
                    {{ itemMeta?.description || itemKey }}
                  </v-list-item-title>
                  <v-list-item-subtitle
                    v-if="itemMeta?.hint"
                    class="config-hint"
                  >
                    {{ itemMeta.hint }}
                  </v-list-item-subtitle>
                </div>
                <div
                  v-for="(childMeta, childKey, childIndex) in childItems(
                    itemMeta,
                  )"
                  :key="childKey"
                >
                  <template
                    v-if="
                      !childMeta?.invisible && shouldShowItem(childMeta, entry)
                    "
                  >
                    <v-row class="config-row">
                      <v-col cols="12" sm="6" class="property-info">
                        <v-list-item density="compact">
                          <v-list-item-title class="property-name">
                            {{ childMeta?.description || childKey }}
                          </v-list-item-title>
                          <v-list-item-subtitle class="property-hint">
                            {{ childMeta?.hint }}
                          </v-list-item-subtitle>
                        </v-list-item>
                      </v-col>
                      <v-col cols="12" sm="6" class="config-input">
                        <ConfigItemRenderer
                          v-model="
                            (entry[itemKey] as UnknownRecord)[
                              childKey
                            ] as ConfigValue
                          "
                          :item-meta="childMeta"
                        />
                      </v-col>
                    </v-row>
                    <v-divider
                      v-if="
                        hasVisibleItemsAfter(
                          itemEntries(childItems(itemMeta)),
                          childIndex,
                          entry,
                        )
                      "
                      class="config-divider"
                    />
                  </template>
                </div>
              </div>

              <!-- Regular Property -->
              <template
                v-else-if="
                  !itemMeta?.invisible && shouldShowItem(itemMeta, entry)
                "
              >
                <v-row class="config-row">
                  <v-col cols="12" sm="6" class="property-info">
                    <v-list-item density="compact">
                      <v-list-item-title class="property-name">
                        <span v-if="itemMeta?.description"
                          >{{ itemMeta?.description }}
                          <span class="property-key"
                            >({{ itemKey }})</span
                          ></span
                        >
                        <span v-else>{{ itemKey }}</span>
                      </v-list-item-title>
                      <v-list-item-subtitle class="property-hint">
                        {{ itemMeta?.hint }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-col>
                  <v-col cols="12" sm="6" class="config-input">
                    <ConfigItemRenderer
                      v-model="entry[itemKey] as ConfigValue"
                      :item-meta="itemMeta"
                    />
                  </v-col>
                </v-row>
                <v-divider
                  v-if="
                    hasVisibleItemsAfter(
                      itemEntries(templateItems(entry)),
                      metaIndex,
                      entry,
                    )
                  "
                  class="config-divider"
                />
              </template>
            </template>
          </div>
        </v-card-text>
      </v-expand-transition>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue';
import ConfigItemRenderer from './ConfigItemRenderer.vue';
import { useI18n } from '@/i18n/composables';

type UnknownRecord = Record<string, unknown>;

type ConfigValue =
  | string
  | number
  | boolean
  | unknown[]
  | UnknownRecord
  | undefined;

type ItemMeta = {
  type?: string;
  description?: string;
  hint?: string;
  invisible?: boolean;
  default?: unknown;
  items?: Record<string, unknown>;
  condition?: Record<string, unknown>;
};

type TemplateMeta = {
  name?: string;
  hint?: string;
  description?: string;
  items?: Record<string, unknown>;
};

const props = defineProps({
  modelValue: {
    // Keep prop type broad to avoid cross-component type alias conflicts.
    type: Array as PropType<Array<Record<string, unknown>>>,
    default: () => [],
  },
  templates: {
    type: Object as PropType<Record<string, TemplateMeta>>,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

const expandedEntries = ref<Record<number, boolean>>({});

const safeText = (val: unknown, fallback: string) =>
  val && typeof val === 'string' ? val : fallback;
const addButtonText = computed(() =>
  safeText(t('core.common.templateList.addEntry'), '添加条目'),
);
const emptyHintText = computed(() =>
  safeText(
    t('core.common.templateList.empty'),
    '暂无条目，请先选择模板并添加。',
  ),
);
const defaultValueMap: Record<string, unknown> = {
  int: 0,
  float: 0.0,
  bool: false,
  string: '',
  text: '',
  list: [] as unknown[],
  object: {} as UnknownRecord,
  template_list: [] as unknown[],
};

const templateOptions = computed(() => {
  return Object.entries(props.templates || {}).map(([value, meta]) => ({
    label: meta.name || value,
    value,
    hint: meta.hint || meta.description || '',
  }));
});

function templateLabel(key: unknown) {
  if (!key)
    return t('core.common.templateList.unknownTemplate') || '未指定模板';
  const k = typeof key === 'string' ? key : String(key);
  return props.templates?.[k]?.name || k;
}

function buildDefaults(
  itemsMeta: Record<string, ItemMeta> = {},
): UnknownRecord {
  const result: UnknownRecord = {};
  for (const [key, meta] of Object.entries(itemsMeta)) {
    if (!meta?.type) continue;
    const hasDefault = Object.prototype.hasOwnProperty.call(meta, 'default');
    const fallback = hasDefault ? meta.default : defaultValueMap[meta.type];

    if (meta.type === 'object') {
      result[key] = buildDefaults(normalizeItems(meta.items));
    } else {
      result[key] = fallback;
    }
  }
  return result;
}

function applyDefaults(
  target: UnknownRecord,
  itemsMeta: Record<string, ItemMeta> = {},
) {
  let changed = false;
  for (const [key, meta] of Object.entries(itemsMeta)) {
    if (!meta?.type) continue;
    const hasDefault = Object.prototype.hasOwnProperty.call(meta, 'default');
    const fallback = hasDefault ? meta.default : defaultValueMap[meta.type];

    if (meta.type === 'object') {
      if (!isRecord(target[key])) {
        target[key] = buildDefaults(normalizeItems(meta.items));
        changed = true;
      } else {
        if (applyDefaults(target[key], normalizeItems(meta.items))) {
          changed = true;
        }
      }
    } else if (!(key in target)) {
      target[key] = fallback;
      changed = true;
    }
  }
  return changed;
}

function ensureEntryDefaults() {
  if (!Array.isArray(props.modelValue)) return;

  let totalChanged = false;
  const nextValue = props.modelValue.map((entry, idx) => {
    const template = getTemplate(entry);
    if (!template || !template.items) return entry;

    // 我们必须克隆以避免就地修改
    const newEntry = JSON.parse(JSON.stringify(entry)) as UnknownRecord;
    let entryChanged = applyDefaults(newEntry, normalizeItems(template.items));

    if (!Object.prototype.hasOwnProperty.call(newEntry, '__template_key')) {
      newEntry.__template_key = '';
      entryChanged = true;
    }

    if (!(idx in expandedEntries.value)) {
      expandedEntries.value[idx] = false;
    }

    if (entryChanged) {
      totalChanged = true;
    }
    return newEntry;
  });

  if (totalChanged) {
    emit('update:modelValue', nextValue);
  }
}

watch(
  () => props.modelValue,
  () => ensureEntryDefaults(),
  { immediate: true, deep: true },
);

function addEntry(templateKey: string) {
  if (!templateKey) return;
  const template = props.templates?.[templateKey];
  if (!template) return;
  const newEntry: UnknownRecord = {
    __template_key: templateKey,
    ...buildDefaults(normalizeItems(template.items)),
  };
  emit('update:modelValue', [...(props.modelValue || []), newEntry]);
  expandedEntries.value[props.modelValue.length] = true;
}

function removeEntry(index: number) {
  const next = [...(props.modelValue || [])];
  next.splice(index, 1);
  const rebuilt: Record<number, boolean> = {};
  next.forEach((_, idx) => {
    const sourceIdx = idx >= index ? idx + 1 : idx;
    rebuilt[idx] = expandedEntries.value[sourceIdx] ?? false;
  });
  expandedEntries.value = rebuilt;
  emit('update:modelValue', next);
}

function toggleEntry(index: number) {
  expandedEntries.value[index] = !expandedEntries.value[index];
}

function getTemplate(entry: Record<string, unknown> | null | undefined) {
  if (!entry) return null;
  const rawKey = (entry as UnknownRecord).__template_key;
  const key = typeof rawKey === 'string' ? rawKey : '';
  if (!key) return null;
  return props.templates?.[key] || null;
}

function templateItems(
  entry: Record<string, unknown>,
): Record<string, ItemMeta> {
  return normalizeItems(getTemplate(entry)?.items);
}

function childItems(itemMeta: ItemMeta): Record<string, ItemMeta> {
  return normalizeItems(itemMeta.items);
}

function itemEntries(
  items: Record<string, ItemMeta> | undefined,
): Array<[string, ItemMeta]> {
  return Object.entries(items || {}) as Array<[string, ItemMeta]>;
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeItems(items: unknown): Record<string, ItemMeta> {
  if (!isRecord(items)) return {};

  const result: Record<string, ItemMeta> = {};
  for (const [key, value] of Object.entries(items)) {
    if (isRecord(value)) {
      result[key] = value as ItemMeta;
    }
  }
  return result;
}

function getValueBySelector(obj: unknown, selector: string) {
  const keys = selector.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (isRecord(current) && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function shouldShowItem(itemMeta: ItemMeta, entry: Record<string, unknown>) {
  if (!itemMeta?.condition) {
    return true;
  }
  for (const [conditionKey, expectedValue] of Object.entries(
    itemMeta.condition,
  )) {
    const actualValue = getValueBySelector(entry, conditionKey);
    if (actualValue !== expectedValue) {
      return false;
    }
  }
  return true;
}

function hasVisibleItemsAfter(
  entries: Array<[string, ItemMeta]>,
  currentIndex: number,
  entry: Record<string, unknown>,
) {
  for (let i = currentIndex + 1; i < entries.length; i++) {
    const [_k, meta] = entries[i];
    if (!meta?.invisible && shouldShowItem(meta, entry)) {
      return true;
    }
  }
  return false;
}
</script>

<style scoped>
.template-list-editor {
  width: 100%;
}

.entry-header {
  cursor: pointer;
  user-select: none;
}

.entry-header:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.top-bar {
  margin-bottom: 8px;
}

.config-section {
  margin-bottom: 12px;
}

.config-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--v-theme-primaryText);
}

.config-hint {
  font-size: 0.75rem;
  color: var(--v-theme-secondaryText);
  margin-top: 2px;
}

.template-entry-body {
  margin-top: 4px;
}

.config-row {
  margin: 0;
  align-items: center;
  padding: 4px 8px;
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
  font-weight: 600;
  color: var(--v-theme-primaryText);
}

.property-hint {
  font-size: 0.75rem;
  color: var(--v-theme-secondaryText);
  margin-top: 2px;
}

.property-key {
  font-size: 0.85em;
  opacity: 0.7;
  font-weight: normal;
}

.config-input {
  padding: 4px 8px;
}

.config-field {
  margin-bottom: 0;
}

.config-divider {
  border-color: rgba(0, 0, 0, 0.05);
  margin: 0px 16px;
}

.nested-container {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  background-color: rgba(0, 0, 0, 0.02);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.editor-container {
  position: relative;
  display: flex;
  width: 100%;
}
</style>
