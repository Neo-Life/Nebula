<template>
  <v-tooltip :text="tm('market.installPlugin')" location="left">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        class="config-floating-btn"
        variant="flat"
        icon
        size="x-large"
        @click="emit('open-install-dialog')"
      >
        <v-icon size="32">mdi-plus</v-icon>
      </v-btn>
    </template>
  </v-tooltip>

  <v-dialog v-model="sourceDialog" max-width="480">
    <v-card style="height: 520px; display: flex; flex-direction: column;">
      <v-card-title class="d-flex align-center">
        <v-icon size="small" class="mr-2">mdi-source-branch</v-icon>
        <span class="text-subtitle-1 font-weight-medium">{{ tm('market.source') }}</span>
        <v-spacer></v-spacer>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text style="flex: 1; overflow-y: auto;">
        <v-chip color="primary" variant="tonal" size="small" class="mb-3">
          <v-icon start size="small">mdi-check</v-icon>
          {{ selectedSourceDisplay }}
        </v-chip>

        <v-list density="compact" class="pa-0">
          <v-list-subheader class="font-weight-bold text-caption text-uppercase mb-1">
            {{ tm('market.availableSources') }}
          </v-list-subheader>

          <v-list-item
            :value="null"
            rounded="md"
            color="primary"
            :active="selectedSource === null"
            @click="emit('select-plugin-source', null)"
          >
            <template #prepend>
              <v-icon icon="mdi-shield-check" size="small" class="mr-2"></v-icon>
            </template>
            <v-list-item-title>{{ tm('market.defaultSource') }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ tm('market.defaultOfficialSource') }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2" v-if="customSources.length > 0"></v-divider>

          <v-list-item
            v-for="source in customSources"
            :key="source.url"
            :value="source.url"
            rounded="md"
            color="primary"
            :active="selectedSource === source.url"
            @click="emit('select-plugin-source', source.url)"
          >
            <template #prepend>
              <v-icon icon="mdi-link-variant" size="small" class="mr-2"></v-icon>
            </template>
            <v-list-item-title>{{ source.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ source.url }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

          <div
            class="d-flex align-center justify-center mt-3"
            style="border: 1px dashed rgba(var(--v-border-color), 0.4); border-radius: 8px; padding: 12px; cursor: pointer;"
            @click="emit('add-custom-source')"
          >
            <v-icon size="small" class="mr-2">mdi-plus</v-icon>
            <span class="text-body-2 font-weight-medium">{{ tm('market.addSource') }}</span>
          </div>
      </v-card-text>

      <v-card-actions class="d-flex align-center" style="gap: 8px;">
        <template v-if="selectedSourceObj">
          <v-btn
            variant="text"
            size="small"
            color="medium-emphasis"
            @click="emit('edit-custom-source', selectedSourceObj)"
          >
            <v-icon start size="small">mdi-pencil-outline</v-icon>
            {{ tm('market.editSource') }}
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            color="error"
            @click="emit('remove-custom-source', selectedSourceObj)"
          >
            <v-icon start size="small">mdi-trash-can-outline</v-icon>
            {{ tm('market.removeSource') }}
          </v-btn>
        </template>
        <v-spacer></v-spacer>
        <v-btn variant="text" color="primary" @click="sourceDialog = false">{{ tm('buttons.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <div class="mt-4">
    <div class="d-flex align-center mb-2" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <div class="d-flex align-center" style="gap: 6px;">
        <h2>{{ tm('market.allPlugins') }}({{ filteredMarketPlugins.length }})</h2>
        <v-btn icon variant="text" @click="emit('refresh')" :loading="refreshingMarket">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>

      <div class="d-flex align-center" style="gap: 8px; flex-wrap: wrap;">
        <v-tooltip :text="selectedSourceTooltip" location="top">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              color="secondary"
              variant="tonal"
              class="text-truncate"
              style="max-width: 220px; height: 40px; padding: 0 12px; display: flex; align-items: center; gap: 8px; border-radius: 8px;"
              height="40"
              @click="sourceDialog = true"
            >
              <v-icon size="small">mdi-source-branch</v-icon>
              <span class="text-body-2 font-weight-medium text-truncate">{{ selectedSourceDisplay }}</span>
            </v-btn>
          </template>
        </v-tooltip>

        <v-select
          v-model="sortByModel"
          :items="sortOptions"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 150px;"
        >
          <template v-slot:prepend-inner>
            <v-icon size="small">mdi-sort</v-icon>
          </template>
        </v-select>

        <v-btn
          icon
          v-if="sortBy !== 'default'"
          @click="toggleSortOrder"
          variant="text"
          density="compact"
        >
          <v-icon size="small">{{ sortOrder === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon>
          <v-tooltip activator="parent" location="top">
            {{ sortOrder === 'desc' ? tm('sort.descending') : tm('sort.ascending') }}
          </v-tooltip>
        </v-btn>
      </div>
    </div>

    <v-row style="min-height: 26rem;">
      <v-col v-for="plugin in paginatedPlugins" :key="plugin.name" cols="12" md="6" lg="4">
        <v-card class="rounded-lg d-flex flex-column plugin-card" elevation="0" style="height: 12rem; position: relative;">
          <v-chip v-if="plugin?.pinned" color="warning" size="x-small" label style="position: absolute; right: 8px; top: 8px; z-index: 10; height: 20px; font-weight: bold;">
            🥳 {{ tm('market.recommended') }}
          </v-chip>

          <v-card-text style="padding: 12px; padding-bottom: 8px; display: flex; gap: 12px; width: 100%; flex: 1; overflow: hidden;">
            <div style="flex-shrink: 0;">
              <img :src="plugin?.logo || defaultPluginIcon" :alt="plugin.name" style="height: 75px; width: 75px; border-radius: 8px; object-fit: cover;" />
            </div>

            <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
              <div class="font-weight-bold" style="margin-bottom: 4px; line-height: 1.3; font-size: 1.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <span style="overflow: hidden; text-overflow: ellipsis;">
                  {{ displayPluginName(plugin) }}
                </span>
              </div>

              <div class="d-flex align-center" style="gap: 4px; margin-bottom: 6px;">
                <v-icon icon="mdi-account" size="x-small" style="color: rgba(var(--v-theme-on-surface), 0.5);"></v-icon>
                <a
                  v-if="plugin?.social_link"
                  :href="plugin.social_link"
                  target="_blank"
                  class="text-subtitle-2 font-weight-medium"
                  style="text-decoration: none; color: rgb(var(--v-theme-primary)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                >
                  {{ plugin.author }}
                </a>
                <span
                  v-else
                  class="text-subtitle-2 font-weight-medium"
                  style="color: rgb(var(--v-theme-primary)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                >
                  {{ plugin.author }}
                </span>
                <div class="d-flex align-center text-subtitle-2 ml-2" style="color: rgba(var(--v-theme-on-surface), 0.7);">
                  <v-icon icon="mdi-source-branch" size="x-small" style="margin-right: 2px;"></v-icon>
                  <span>{{ plugin.version }}</span>
                </div>
              </div>

              <div class="text-caption plugin-description">
                {{ formatDescription(plugin.desc) }}
              </div>

              <div class="d-flex align-center" style="gap: 8px; margin-top: auto;">
                <div v-if="plugin.stars !== undefined" class="d-flex align-center text-subtitle-2" style="color: rgba(var(--v-theme-on-surface), 0.7);">
                  <v-icon icon="mdi-star" size="x-small" style="margin-right: 2px;"></v-icon>
                  <span>{{ plugin.stars }}</span>
                </div>
                <div v-if="plugin.updated_at" class="d-flex align-center text-subtitle-2" style="color: rgba(var(--v-theme-on-surface), 0.7);">
                  <v-icon icon="mdi-clock-outline" size="x-small" style="margin-right: 2px;"></v-icon>
                  <span>{{ formatUpdatedAt(plugin.updated_at) }}</span>
                </div>
              </div>
            </div>
          </v-card-text>

          <v-card-actions style="gap: 6px; padding: 8px 12px; padding-top: 0;">
            <v-chip
              v-for="tag in plugin.tags?.slice(0, 2)"
              :key="tag"
              :color="tag === 'danger' ? 'error' : 'primary'"
              label
              size="x-small"
              style="height: 20px;"
            >
              {{ tag === 'danger' ? tm('tags.danger') : tag }}
            </v-chip>
            <v-menu v-if="plugin.tags && plugin.tags.length > 2" open-on-hover offset-y>
              <template v-slot:activator="{ props: menuProps }">
                <v-chip v-bind="menuProps" color="grey" label size="x-small" style="height: 20px; cursor: pointer;">
                  +{{ plugin.tags.length - 2 }}
                </v-chip>
              </template>
              <v-list density="compact">
                <v-list-item v-for="tag in plugin.tags.slice(2)" :key="tag">
                  <v-chip :color="tag === 'danger' ? 'error' : 'primary'" label size="small">
                    {{ tag === 'danger' ? tm('tags.danger') : tag }}
                  </v-chip>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-spacer></v-spacer>
            <v-btn v-if="plugin?.repo" color="secondary" size="small" variant="tonal" :href="plugin.repo" target="_blank" style="height: 32px;">
              <v-icon icon="mdi-github" start size="small"></v-icon>
              {{ tm('market.repo') }}
            </v-btn>
            <v-btn
              v-if="!plugin?.installed"
              color="primary"
              size="small"
              @click="emit('handle-install-plugin', plugin)"
              variant="flat"
              style="height: 32px;"
            >
              {{ tm('buttons.install') }}
            </v-btn>
            <v-chip v-else color="success" size="x-small" label style="height: 20px;">
              ✓ {{ tm('status.installed') }}
            </v-chip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <div class="d-flex justify-center mt-4" v-if="totalPages > 1">
      <v-pagination v-model="currentPageModel" :length="totalPages" :total-visible="7" size="small"></v-pagination>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import defaultPluginIcon from '@/assets/images/plugin_icon.png'
import { useModuleI18n } from '@/i18n/composables'

const props = defineProps<{
  filteredMarketPlugins: Array<any>
  paginatedPlugins: Array<any>
  currentPage: number
  totalPages: number
  sortBy: string
  sortOrder: string
  sortOptions: Array<{ title: string; value: string }>
  refreshingMarket: boolean
  customSources: Array<{ name: string; url: string }>
  selectedSource: string | null
  selectedSourceObj: { name: string; url: string } | null
  showPluginFullName: boolean
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:sortBy', value: string): void
  (e: 'update:sortOrder', value: string): void
  (e: 'refresh'): void
  (e: 'handle-install-plugin', plugin: any): void
  (e: 'open-install-dialog'): void
  (e: 'select-plugin-source', source: string | null): void
  (e: 'add-custom-source'): void
  (e: 'edit-custom-source', source: { name: string; url: string }): void
  (e: 'remove-custom-source', source: { name: string; url: string }): void
}>()

const { tm } = useModuleI18n('features/extension')
const MAX_DESCRIPTION_LENGTH = 50
const sourceDialog = ref(false)

const currentPageModel = computed({
  get: () => props.currentPage,
  set: value => emit('update:currentPage', value),
})

const sortByModel = computed({
  get: () => props.sortBy,
  set: value => emit('update:sortBy', value),
})

const toggleSortOrder = () => {
  const next = props.sortOrder === 'desc' ? 'asc' : 'desc'
  emit('update:sortOrder', next)
}

const selectedSourceDisplay = computed(() => {
  if (!props.selectedSource) {
    return tm('market.defaultSource')
  }
  return props.customSources.find(source => source.url === props.selectedSource)?.name ?? props.selectedSource
})

const selectedSourceTooltip = computed(() => props.selectedSource || tm('market.defaultOfficialSource'))

const displayPluginName = (plugin: any) => {
  if (plugin.display_name?.length) {
    return plugin.display_name
  }
  return props.showPluginFullName ? plugin.name : plugin.trimmedName
}

const formatUpdatedAt = (value: string) => {
  return new Date(value).toLocaleString()
}

const formatDescription = (value?: string) => {
  const text = (value ?? '').trim()
  if (!text) {
    return ''
  }
  return text.length > MAX_DESCRIPTION_LENGTH
    ? `${text.slice(0, MAX_DESCRIPTION_LENGTH)}…`
    : text
}
</script>
