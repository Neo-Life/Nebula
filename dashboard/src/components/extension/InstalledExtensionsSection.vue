<template>
  <v-row class="mb-4">
    <v-col cols="12" class="d-flex align-center flex-wrap ga-2">
      <v-btn-group variant="outlined" density="comfortable" color="primary">
        <v-btn
          @click="updateIsListView(false)"
          :color="!isListView ? 'primary' : undefined"
          :variant="!isListView ? 'flat' : 'outlined'"
        >
          <v-icon>mdi-view-grid</v-icon>
        </v-btn>
        <v-btn
          @click="updateIsListView(true)"
          :color="isListView ? 'primary' : undefined"
          :variant="isListView ? 'flat' : 'outlined'"
        >
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
      </v-btn-group>

      <v-btn class="ml-2" variant="tonal" @click="emit('toggle-show-reserved')">
        <v-icon>{{ showReserved ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
        {{ showReserved ? tm('buttons.hideSystemPlugins') : tm('buttons.showSystemPlugins') }}
      </v-btn>

      <v-btn
        class="ml-2"
        color="warning"
        variant="tonal"
        :disabled="updatableExtensions.length === 0"
        :loading="updatingAll"
        @click="emit('update-all')"
      >
        <v-icon>mdi-update</v-icon>
        {{ tm('buttons.updateAll') }}
      </v-btn>

      <v-btn class="ml-2" color="primary" variant="tonal" @click="emit('open-install-dialog')">
        <v-icon>mdi-plus</v-icon>
        {{ tm('buttons.install') }}
      </v-btn>

      <v-col cols="12" sm="auto" class="ml-auto">
        <v-dialog max-width="500px" v-if="extensionMessage">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon size="small" color="error" class="ml-2" variant="tonal">
              <v-icon>mdi-alert-circle</v-icon>
            </v-btn>
          </template>
          <template v-slot:default="{ isActive }">
            <v-card class="rounded-lg">
              <v-card-title class="headline d-flex align-center">
                <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
                {{ tm('dialogs.error.title') }}
              </v-card-title>
              <v-card-text>
                <p class="text-body-1">{{ extensionMessage }}</p>
                <p class="text-caption mt-2">{{ tm('dialogs.error.checkConsole') }}</p>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="isActive.value = false">{{ tm('buttons.close') }}</v-btn>
              </v-card-actions>
            </v-card>
          </template>
        </v-dialog>
      </v-col>
    </v-col>
  </v-row>

  <v-fade-transition hide-on-leave>
    <div v-if="isListView">
      <v-card class="rounded-lg overflow-hidden elevation-1">
        <v-data-table :headers="pluginHeaders" :items="filteredPlugins" :loading="loading" item-key="name" hover>
          <template v-slot:loader>
            <v-row class="py-8 d-flex align-center justify-center">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <span class="ml-2">{{ tm('status.loading') }}</span>
            </v-row>
          </template>

          <template v-slot:item.name="{ item }">
            <div class="d-flex align-center py-2">
              <div class="mr-3" style="flex-shrink: 0;">
                <img
                  :src="resolveRow(item).logo || defaultPluginIcon"
                  :alt="resolveRow(item).name"
                  style="height: 40px; width: 40px; border-radius: 8px; object-fit: cover;"
                />
              </div>
              <div>
                <div class="text-subtitle-1 font-weight-medium">
                  {{ resolveRow(item).display_name && resolveRow(item).display_name.length ? resolveRow(item).display_name : resolveRow(item).name }}
                </div>
                <div v-if="resolveRow(item).display_name && resolveRow(item).display_name.length" class="text-caption text-medium-emphasis mt-1">
                  {{ resolveRow(item).name }}
                </div>
                <div v-if="resolveRow(item).reserved" class="d-flex align-center mt-1">
                  <v-chip color="primary" size="x-small" class="font-weight-medium">{{ tm('status.system') }}</v-chip>
                </div>
              </div>
            </div>
          </template>

          <template v-slot:item.desc="{ item }">
            <div class="text-body-2 text-medium-emphasis">{{ resolveRow(item).desc }}</div>
          </template>

          <template v-slot:item.version="{ item }">
            <div class="d-flex align-center">
              <span class="text-body-2">{{ resolveRow(item).version }}</span>
              <v-icon v-if="resolveRow(item).has_update" color="warning" size="small" class="ml-1">mdi-alert</v-icon>
              <v-tooltip v-if="resolveRow(item).has_update" activator="parent">
                <span>{{ tm('messages.hasUpdate') }} {{ resolveRow(item).online_version }}</span>
              </v-tooltip>
            </div>
          </template>

          <template v-slot:item.author="{ item }">
            <div class="text-body-2">{{ resolveRow(item).author }}</div>
          </template>

          <template v-slot:item.activated="{ item }">
            <v-chip :color="resolveRow(item).activated ? 'success' : 'error'" size="small" class="font-weight-medium" :variant="resolveRow(item).activated ? 'flat' : 'outlined'">
              {{ resolveRow(item).activated ? tm('status.enabled') : tm('status.disabled') }}
            </v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn-group density="comfortable" variant="text" color="primary">
                <v-btn v-if="!resolveRow(item).activated" icon size="small" color="success" @click="emit('plugin-on', resolveRow(item))">
                  <v-icon>mdi-play</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.enable') }}</v-tooltip>
                </v-btn>
                <v-btn v-else icon size="small" color="error" @click="emit('plugin-off', resolveRow(item))">
                  <v-icon>mdi-pause</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.disable') }}</v-tooltip>
                </v-btn>

                <v-btn icon size="small" color="info" @click="emit('reload', resolveRow(item).name)">
                  <v-icon>mdi-refresh</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.reload') }}</v-tooltip>
                </v-btn>

                <v-btn icon size="small" @click="emit('open-config', resolveRow(item).name)">
                  <v-icon>mdi-cog</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.configure') }}</v-tooltip>
                </v-btn>

                <v-btn icon size="small" @click="emit('show-info', resolveRow(item))">
                  <v-icon>mdi-information</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.viewInfo') }}</v-tooltip>
                </v-btn>

                <v-btn v-if="resolveRow(item).repo" icon size="small" @click="emit('view-readme', resolveRow(item))">
                  <v-icon>mdi-book-open-page-variant</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.viewDocs') }}</v-tooltip>
                </v-btn>

                <v-btn icon size="small" color="warning" @click="emit('update-extension', resolveRow(item).name)">
                  <v-icon>mdi-update</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.update') }}</v-tooltip>
                </v-btn>

                <v-btn icon size="small" color="error" @click="emit('uninstall', { extension: resolveRow(item) })" :disabled="resolveRow(item).reserved">
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.uninstall') }}</v-tooltip>
                </v-btn>
              </v-btn-group>
            </div>
          </template>

          <template v-slot:no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="info" class="mb-4">mdi-puzzle-outline</v-icon>
              <div class="text-h5 mb-2">{{ tm('empty.noPlugins') }}</div>
              <div class="text-body-1 mb-4">{{ tm('empty.noPluginsDesc') }}</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <div v-else>
      <v-row v-if="filteredPlugins.length === 0" class="text-center">
        <v-col cols="12" class="pa-2">
          <v-icon size="64" color="info" class="mb-4">mdi-puzzle-outline</v-icon>
          <div class="text-h5 mb-2">{{ tm('empty.noPlugins') }}</div>
          <div class="text-body-1 mb-4">{{ tm('empty.noPluginsDesc') }}</div>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6" lg="4" v-for="extension in filteredPlugins" :key="extension.name" class="pb-2">
          <ExtensionCard
            :extension="extension"
            class="rounded-lg"
            style="background-color: rgb(var(--v-theme-mcpCardBg));"
            @configure="emit('open-config', extension.name)"
            @uninstall="options => emit('uninstall', { extension, options })"
            @update="emit('update-extension', extension.name)"
            @reload="emit('reload', extension.name)"
            @toggle-activation="extension.activated ? emit('plugin-off', extension) : emit('plugin-on', extension)"
            @view-handlers="emit('show-info', extension)"
            @view-readme="emit('view-readme', extension)"
          />
        </v-col>
      </v-row>
    </div>
  </v-fade-transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExtensionCard from '@/components/shared/ExtensionCard.vue'
import defaultPluginIcon from '@/assets/images/plugin_icon.png'
import { useModuleI18n } from '@/i18n/composables'

import type { InstalledPlugin, UninstallOptions } from '@/types/extension'

const props = defineProps<{
  isListView: boolean
  filteredPlugins: InstalledPlugin[]
  loading: boolean
  pluginHeaders: Array<{ title: string; key: string; [k: string]: unknown }>
  showReserved: boolean
  updatableExtensions: InstalledPlugin[]
  updatingAll: boolean
  extensionMessage?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:isListView', value: boolean): void
  (e: 'toggle-show-reserved'): void
  (e: 'update-all'): void
  (e: 'open-install-dialog'): void
  (e: 'plugin-on', extension: InstalledPlugin): void
  (e: 'plugin-off', extension: InstalledPlugin): void
  (e: 'reload', name: string): void
  (e: 'open-config', name: string): void
  (e: 'show-info', extension: InstalledPlugin): void
  (e: 'view-readme', extension: InstalledPlugin): void
  (e: 'update-extension', name: string): void
  (e: 'uninstall', payload: { extension: InstalledPlugin; options?: UninstallOptions }): void
}>()

const { tm } = useModuleI18n('features/extension')

const updateIsListView = (value: boolean) => {
  emit('update:isListView', value)
}

const resolveRow = (row: unknown): InstalledPlugin => {
  const maybeWrapper = row as { raw?: InstalledPlugin } | null
  if (maybeWrapper && typeof maybeWrapper === 'object' && maybeWrapper.raw) {
    return maybeWrapper.raw
  }
  return row as InstalledPlugin
}

const extensionMessage = computed(() => props.extensionMessage ?? '')
</script>
