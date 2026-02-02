<template>
  <div class="market-fab-stack">
    <v-badge
      :content="cartCount"
      :model-value="cartCount > 0"
      color="primary"
      location="top end"
      class="market-fab-badge"
    >
      <v-tooltip :text="tm('market.cart.title')" location="left">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            class="config-floating-btn market-fab-btn"
            variant="flat"
            icon
            size="x-large"
            @click="cartDialog = true"
          >
            <v-icon size="32">mdi-cart</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </v-badge>

    <v-tooltip :text="tm('market.installPlugin')" location="left">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          class="config-floating-btn market-fab-btn"
          variant="flat"
          icon
          size="x-large"
          @click="emit('open-install-dialog')"
        >
          <v-icon size="32">mdi-plus</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </div>

  <v-dialog v-model="sourceDialog" max-width="480" scroll-strategy="block" scroll-target="body">
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

  <div class="mt-4 market-page">
    <div class="d-flex align-center mb-2" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <div class="d-flex align-center" style="gap: 6px;">
        <h2 class="d-flex align-center" style="gap: 8px;">
          <span>{{ tm('market.allPlugins') }}</span>
          <v-chip
            size="small"
            variant="flat"
            color="primary"
            rounded="pill"
            class="market-count-chip"
          >
            {{ filteredMarketPlugins.length }}
          </v-chip>
        </h2>
        <v-btn icon variant="text" @click="emit('refresh')" :loading="marketLoadingLatched">
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

    <v-dialog v-model="cartDialog" max-width="720" scroll-strategy="block" scroll-target="body">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between px-4 py-3">
          <div class="d-flex align-center" style="gap: 8px; min-width: 0;">
            <v-icon>mdi-cart</v-icon>
            <span class="text-subtitle-1 font-weight-medium">{{ tm('market.cart.title') }}</span>
            <v-chip size="small" color="primary" variant="tonal">{{ cartCount }}</v-chip>
          </div>

          <v-btn icon variant="text" @click="cartDialog = false">
            <v-icon>mdi-close</v-icon>
            <v-tooltip activator="parent" location="top">{{ tm('buttons.close') }}</v-tooltip>
          </v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="px-4 py-4" style="max-height: 60vh; overflow-y: auto;">
          <v-alert v-if="cartItems.length === 0" density="compact" variant="tonal" color="secondary">
            {{ tm('market.cart.empty') }}
          </v-alert>

          <v-list v-else density="compact">
            <v-list-item v-for="plugin in cartItems" :key="getCartKey(plugin)">
              <v-list-item-title class="text-body-1 font-weight-medium">
                {{ displayPluginName(plugin) }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ plugin.author }} · {{ plugin.version }}
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                  icon
                  variant="text"
                  :disabled="!plugin?.repo"
                  @click="emit('view-readme', plugin)"
                >
                  <v-icon>mdi-book-open-variant</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('market.cart.viewReadme') }}</v-tooltip>
                </v-btn>

                <v-btn icon variant="text" @click="emit('toggle-cart', plugin)">
                  <v-icon>mdi-delete-outline</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('market.cart.remove') }}</v-tooltip>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="px-4 pb-4">
          <v-btn
            color="error"
            variant="text"
            :disabled="cartItems.length === 0"
            @click="emit('clear-cart')"
          >
            {{ tm('market.cart.clear') }}
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="cartItems.length === 0"
            @click="emit('install-cart')"
          >
            {{ tm('market.cart.installSelected') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-row style="min-height: 26rem;">
      <template v-if="marketLoadingLatched">
        <v-col
          v-for="n in 6"
          :key="`skeleton-${n}`"
          cols="12"
          md="6"
          lg="4"
        >
          <v-skeleton-loader type="card" class="rounded-lg" />
        </v-col>
      </template>

      <template v-else>
        <v-col v-for="plugin in paginatedPlugins" :key="plugin.name" cols="12" md="6" lg="4">
          <ItemCard
            :item="toItemCardPlugin(plugin)"
            title-field="_title"
            title-class="text-h3"
            :show-switch="false"
            :show-edit-button="false"
            :show-delete-button="false"
            :no-padding="true"
            class="plugin-card"
            style="height: 15rem;"
          >
            <template #item-details>
              <v-chip v-if="plugin?.pinned" color="warning" size="small" label style="position: absolute; right: 8px; top: 8px; z-index: 10; height: 26px; padding: 0 10px; font-weight: bold;">
                {{ tm('market.recommended') }}
              </v-chip>

              <div style="padding: 12px; padding-bottom: 8px; display: flex; gap: 12px; width: 100%; height: 100%; overflow: hidden;">
                <div style="flex-shrink: 0;">
                  <img :src="plugin?.logo || defaultPluginIcon" :alt="plugin.name" style="height: 100px; width: 100px; border-radius: 8px; object-fit: cover;" />
                </div>

                <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
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
              </div>
            </template>

            <template #footer-start>
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
            </template>

            <template #actions>
              <v-tooltip :text="isInCart(plugin) ? tm('market.cart.remove') : tm('market.cart.add')" location="top">
                <template #activator="{ props: tipProps }">
                  <v-btn
                    v-bind="tipProps"
                    icon
                    variant="text"
                    size="small"
                    color="primary"
                    style="height: 32px; width: 32px;"
                    :disabled="!!plugin?.installed"
                    @click="emit('toggle-cart', plugin)"
                  >
                    <v-icon size="20">{{ isInCart(plugin) ? 'mdi-cart-remove' : 'mdi-cart-plus' }}</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-btn v-if="plugin?.repo" color="secondary" size="70" variant="tonal" :href="plugin.repo" target="_blank" style="height: 32px;">
                <v-icon icon="mdi-github" start size="20"></v-icon>
                {{ tm('buttons.viewRepo') }}
              </v-btn>

              <v-btn
                v-if="!plugin?.installed"
                color="primary"
                size="50"
                @click="emit('handle-install-plugin', plugin)"
                variant="flat"
                style="height: 32px;"
              >
                {{ tm('buttons.install') }}
              </v-btn>
              <v-btn v-else color="success" size="70" variant="tonal" disabled style="height: 32px;">
                ✓ {{ tm('status.installed') }}
              </v-btn>
            </template>
          </ItemCard>
        </v-col>
      </template>
    </v-row>

    <div class="d-flex justify-center mt-4" v-if="totalPages > 1">
      <v-pagination
        v-model="currentPageModel"
        :length="totalPages"
        :total-visible="paginationTotalVisible"
        :size="paginationSize"
      ></v-pagination>
    </div>
  </div>

  <!-- 危险插件确认对话框（下沉） -->
  <v-dialog v-model="dangerConfirmDialogModel" width="500" persistent>
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
        <v-btn color="grey" @click="emit('cancel-danger-install')">
          {{ tm('dialogs.danger_warning.cancel') }}
        </v-btn>
        <v-btn color="warning" @click="emit('confirm-danger-install')">
          {{ tm('dialogs.danger_warning.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 添加/编辑自定义插件源对话框（下沉） -->
  <v-dialog v-model="showSourceDialogModel" width="500">
    <v-card>
      <v-card-title class="text-h5">{{ props.editingSource ? tm('market.editSource') : tm('market.addSource') }}</v-card-title>
      <v-card-text>
        <div class="pa-2">
          <v-text-field
            v-model="sourceNameModel"
            :label="tm('market.sourceName')"
            variant="outlined"
            prepend-inner-icon="mdi-rename-box"
            hide-details
            class="mb-4"
            placeholder="我的插件源"
          ></v-text-field>

          <v-text-field
            v-model="sourceUrlModel"
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
        <v-btn color="grey" variant="text" @click="showSourceDialogModel = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="primary" variant="text" @click="emit('save-custom-source')">{{ tm('buttons.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 删除插件源确认对话框（下沉） -->
  <v-dialog v-model="showRemoveSourceDialogModel" width="400">
    <v-card>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('dialogs.uninstall.title') }}
      </v-card-title>
      <v-card-text>
        <div>{{ tm('market.confirmRemoveSource') }}</div>
        <div v-if="props.sourceToRemove" class="mt-2">
          <strong>{{ props.sourceToRemove.name }}</strong>
          <div class="text-caption">{{ props.sourceToRemove.url }}</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="showRemoveSourceDialogModel = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="error" variant="text" @click="emit('confirm-remove-source')">{{ tm('buttons.deleteSource') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import defaultPluginIcon from '@/assets/images/plugin_icon.png'
import { useModuleI18n } from '@/i18n/composables'
import ItemCard from '@/components/shared/ItemCard.vue'

import type { PluginMarketItem, PluginSource } from '@/types/extension'

const props = defineProps<{
  filteredMarketPlugins: PluginMarketItem[]
  paginatedPlugins: PluginMarketItem[]
  currentPage: number
  totalPages: number
  sortBy: string
  sortOrder: string
  sortOptions: Array<{ title: string; value: string }>
  refreshingMarket: boolean
  marketLoading: boolean
  customSources: PluginSource[]
  selectedSource: string | null
  selectedSourceObj: PluginSource | null
  showPluginFullName: boolean
  cartItems: PluginMarketItem[]
  cartCount: number

  dangerConfirmDialog: boolean

  showSourceDialog: boolean
  sourceName: string
  sourceUrl: string
  editingSource: boolean

  showRemoveSourceDialog: boolean
  sourceToRemove: PluginSource | null
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:sortBy', value: string): void
  (e: 'update:sortOrder', value: string): void
  (e: 'refresh'): void
  (e: 'handle-install-plugin', plugin: PluginMarketItem): void
  (e: 'open-install-dialog'): void
  (e: 'select-plugin-source', source: string | null): void
  (e: 'add-custom-source'): void
  (e: 'edit-custom-source', source: PluginSource): void
  (e: 'remove-custom-source', source: PluginSource): void
  (e: 'toggle-cart', plugin: PluginMarketItem): void
  (e: 'clear-cart'): void
  (e: 'install-cart'): void
  (e: 'view-readme', plugin: PluginMarketItem): void

  (e: 'update:dangerConfirmDialog', value: boolean): void
  (e: 'cancel-danger-install'): void
  (e: 'confirm-danger-install'): void

  (e: 'update:showSourceDialog', value: boolean): void
  (e: 'update:sourceName', value: string): void
  (e: 'update:sourceUrl', value: string): void
  (e: 'save-custom-source'): void

  (e: 'update:showRemoveSourceDialog', value: boolean): void
  (e: 'confirm-remove-source'): void
}>()

const { tm } = useModuleI18n('features/extension')
const display = useDisplay()
const MAX_DESCRIPTION_LENGTH = 50
const sourceDialog = ref(false)
const cartDialog = ref(false)

const dangerConfirmDialogModel = computed({
  get: () => props.dangerConfirmDialog,
  set: value => emit('update:dangerConfirmDialog', value),
})

const showSourceDialogModel = computed({
  get: () => props.showSourceDialog,
  set: value => emit('update:showSourceDialog', value),
})

const sourceNameModel = computed({
  get: () => props.sourceName,
  set: value => emit('update:sourceName', value),
})

const sourceUrlModel = computed({
  get: () => props.sourceUrl,
  set: value => emit('update:sourceUrl', value),
})

const showRemoveSourceDialogModel = computed({
  get: () => props.showRemoveSourceDialog,
  set: value => emit('update:showRemoveSourceDialog', value),
})

const marketLoadingLatched = ref(false)
const marketLoadingSeq = ref(0)
const marketLoadingStartedAt = ref(0)

const isMarketLoading = computed(() => props.refreshingMarket || props.marketLoading)

watch(
  isMarketLoading,
  (loading) => {
    if (loading) {
      marketLoadingSeq.value += 1
      marketLoadingStartedAt.value = Date.now()
      marketLoadingLatched.value = true
      return
    }

    const seq = marketLoadingSeq.value
    const elapsed = Date.now() - marketLoadingStartedAt.value
    const remaining = Math.max(0, 1000 - elapsed)

    window.setTimeout(() => {
      if (marketLoadingSeq.value !== seq) return
      if (isMarketLoading.value) return
      marketLoadingLatched.value = false
    }, remaining)
  },
  { immediate: true, flush: 'sync' }
)

const paginationTotalVisible = computed(() => (display.smAndDown.value ? 3 : 7))
const paginationSize = computed(() => (display.smAndDown.value ? 'x-small' : 'small'))

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

const displayPluginName = (plugin: PluginMarketItem) => {
  if (plugin.display_name?.length) {
    return plugin.display_name
  }
  return props.showPluginFullName ? plugin.name : plugin.trimmedName
}

const getCartKey = (plugin: PluginMarketItem) => {
  const repo = (plugin.repo ?? '').trim()
  return repo || plugin.name
}

const isInCart = (plugin: PluginMarketItem) => {
  const key = getCartKey(plugin)
  return props.cartItems.some(p => getCartKey(p) === key)
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

const toItemCardPlugin = (plugin: PluginMarketItem) => {
  return {
    ...plugin,
    _title: displayPluginName(plugin) as string,
  }
}
</script>

<style scoped>
.market-fab-stack {
  position: fixed;
  right: 52px;
  bottom: 52px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.market-page {
  padding-bottom: 70px;
}

@media (max-width: 600px) {
  .market-fab-stack {
    right: 16px;
    bottom: 16px;
  }

  .market-page {
    padding-bottom: 120px;
  }
}

.market-fab-btn {
  position: static !important;
  right: auto !important;
  bottom: auto !important;
  pointer-events: auto;
}

.market-fab-badge {
  pointer-events: auto;
}

.market-fab-badge :deep(.v-badge__badge) {
  color: #fff !important;
}

.market-count-chip {
  min-width: 2.5em;
  padding: 0 0.75em;
  height: 1.6em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-surface)) !important;
}

.market-count-chip :deep(.v-chip__content) {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: rgb(var(--v-theme-surface)) !important;
}
</style>
