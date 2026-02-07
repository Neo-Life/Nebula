<template>
  <div class="mt-4">
    <div
      class="models-toolbar d-flex flex-column flex-sm-row align-start align-sm-center ga-2 mb-2"
    >
      <div class="d-flex align-center ga-2 flex-wrap">
        <h3 class="text-h5 font-weight-bold mb-0">
          {{ tm('models.configured') }}
        </h3>
        <small v-if="availableCount" style="color: grey"
          >{{ tm('models.available') }} {{ availableCount }}</small
        >
      </div>

      <v-text-field
        v-model="modelSearchProxy"
        density="compact"
        prepend-inner-icon="mdi-magnify"
        hide-details
        variant="solo-filled"
        flat
        class="models-search w-100 w-sm-auto"
        :placeholder="tm('models.searchPlaceholder')"
      />

      <div
        class="d-flex align-center ga-2 flex-wrap w-100 w-sm-auto ms-sm-auto"
      >
        <v-btn
          color="primary"
          prepend-icon="mdi-download"
          :loading="loadingModels"
          variant="tonal"
          size="small"
          class="flex-grow-1 flex-sm-grow-0"
          @click="emit('fetch-models')"
        >
          {{
            isSourceModified
              ? tm('providerSources.saveAndFetchModels')
              : tm('providerSources.fetchModels')
          }}
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-pencil-plus"
          variant="text"
          size="small"
          class="flex-grow-1 flex-sm-grow-0"
          @click="emit('open-manual-model')"
        >
          {{ tm('models.manualAddButton') }}
        </v-btn>
      </div>
    </div>

    <v-list
      density="compact"
      class="rounded-lg border"
      style="
        max-height: 520px;
        overflow-y: auto;
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          Roboto,
          Oxygen,
          Ubuntu,
          Cantarell,
          'Open Sans',
          'Helvetica Neue',
          sans-serif;
      "
    >
      <template v-if="entries.length > 0">
        <template
          v-for="entry in entries"
          :key="
            entry.type === 'configured'
              ? `provider-${entry.provider.id}`
              : `model-${entry.model}`
          "
        >
          <v-tooltip
            v-if="entry.type === 'configured'"
            location="top"
            max-width="400"
          >
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                class="provider-compact-item"
                @click="emit('open-provider-edit', entry.provider)"
              >
                <v-list-item-title class="font-weight-medium text-truncate">
                  {{ entry.provider.id }}
                </v-list-item-title>
                <v-list-item-subtitle
                  class="text-caption text-grey d-flex align-center ga-1"
                  style="font-family: monospace"
                >
                  <span>{{ entry.provider.model }}</span>
                  <v-icon
                    v-if="supportsImageInput(entry.metadata)"
                    size="14"
                    color="grey"
                  >
                    mdi-eye-outline
                  </v-icon>
                  <v-icon
                    v-if="supportsToolCall(entry.metadata)"
                    size="14"
                    color="grey"
                  >
                    mdi-wrench
                  </v-icon>
                  <v-icon
                    v-if="supportsReasoning(entry.metadata)"
                    size="14"
                    color="grey"
                  >
                    mdi-brain
                  </v-icon>
                  <span v-if="formatContextLimit(entry.metadata)">
                    {{ formatContextLimit(entry.metadata) }}
                  </span>
                </v-list-item-subtitle>
                <template #append>
                  <div class="d-flex align-center ga-1" @click.stop>
                    <v-switch
                      v-model="entry.provider.enable"
                      density="compact"
                      inset
                      hide-details
                      color="primary"
                      class="mr-1"
                      @update:model-value="
                        emit(
                          'toggle-provider-enable',
                          entry.provider,
                          Boolean($event),
                        )
                      "
                    />
                    <v-tooltip location="top" max-width="300">
                      {{ tm('availability.test') }}
                      <template #activator="{ props }">
                        <v-btn
                          icon="mdi-connection"
                          size="small"
                          variant="text"
                          :disabled="!entry.provider.enable"
                          :loading="isProviderTesting(entry.provider.id)"
                          v-bind="props"
                          @click.stop="emit('test-provider', entry.provider)"
                        />
                      </template>
                    </v-tooltip>

                    <v-tooltip location="top" max-width="300">
                      {{ tm('models.configure') }}
                      <template #activator="{ props }">
                        <v-btn
                          icon="mdi-cog"
                          size="small"
                          variant="text"
                          v-bind="props"
                          @click.stop="
                            emit('open-provider-edit', entry.provider)
                          "
                        />
                      </template>
                    </v-tooltip>

                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click.stop="emit('delete-provider', entry.provider)"
                    />
                  </div>
                </template>
              </v-list-item>
            </template>
            <div>
              <div>
                <strong>{{ tm('models.tooltips.providerId') }}:</strong>
                {{ entry.provider.id }}
              </div>
              <div>
                <strong>{{ tm('models.tooltips.modelId') }}:</strong>
                {{ entry.provider.model }}
              </div>
            </div>
          </v-tooltip>

          <v-tooltip v-else location="top" max-width="400">
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                class="cursor-pointer"
                @click="emit('add-model-provider', entry.model)"
              >
                <v-list-item-title>{{ entry.model }}</v-list-item-title>
                <v-list-item-subtitle
                  class="text-caption text-grey d-flex align-center ga-1"
                >
                  <span>{{ entry.model }}</span>
                  <v-icon
                    v-if="supportsImageInput(entry.metadata)"
                    size="14"
                    color="grey"
                  >
                    mdi-eye-outline
                  </v-icon>
                  <v-icon
                    v-if="supportsToolCall(entry.metadata)"
                    size="14"
                    color="grey"
                  >
                    mdi-wrench
                  </v-icon>
                  <v-icon
                    v-if="supportsReasoning(entry.metadata)"
                    size="14"
                    color="grey"
                  >
                    mdi-brain
                  </v-icon>
                  <span v-if="formatContextLimit(entry.metadata)">
                    {{ formatContextLimit(entry.metadata) }}
                  </span>
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                    icon="mdi-plus"
                    size="small"
                    variant="text"
                    color="primary"
                  />
                </template>
              </v-list-item>
            </template>
            <div>
              <div>
                <strong>{{ tm('models.tooltips.modelId') }}:</strong>
                {{ entry.model }}
              </div>
            </div>
          </v-tooltip>
        </template>
      </template>
      <template v-else>
        <div class="text-center pa-4 text-medium-emphasis">
          <v-icon size="48" color="grey-lighten-1">
            mdi-package-variant
          </v-icon>
          <p class="text-grey mt-2">
            {{ tm('models.empty') }}
          </p>
        </div>
      </template>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';

type ProviderLike = {
  id: string;
  model?: string;
  enable?: boolean;
};

type ModelEntryConfigured = {
  type: 'configured';
  provider: ProviderLike;
  metadata: unknown;
};

type ModelEntryAvailable = {
  type: 'available';
  model: string;
  metadata: unknown;
};

type ModelEntry = ModelEntryConfigured | ModelEntryAvailable;

type TmFn = (key: string, params?: Record<string, string | number>) => string;
type SupportsFlagFn = (meta: unknown) => boolean;
type FormatContextLimitFn = (meta: unknown) => string;

const props = defineProps({
  entries: {
    type: Array as PropType<ModelEntry[]>,
    default: () => [],
  },
  availableCount: {
    type: Number,
    default: 0,
  },
  modelSearch: {
    type: String,
    default: '',
  },
  loadingModels: {
    type: Boolean,
    default: false,
  },
  isSourceModified: {
    type: Boolean,
    default: false,
  },
  supportsImageInput: {
    type: Function as PropType<SupportsFlagFn>,
    required: true,
  },
  supportsToolCall: {
    type: Function as PropType<SupportsFlagFn>,
    required: true,
  },
  supportsReasoning: {
    type: Function as PropType<SupportsFlagFn>,
    required: true,
  },
  formatContextLimit: {
    type: Function as PropType<FormatContextLimitFn>,
    required: true,
  },
  testingProviders: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  tm: {
    type: Function as PropType<TmFn>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'update:modelSearch', value: string): void;
  (e: 'fetch-models'): void;
  (e: 'open-manual-model'): void;
  (e: 'open-provider-edit', provider: ProviderLike): void;
  (e: 'toggle-provider-enable', provider: ProviderLike, enabled: boolean): void;
  (e: 'test-provider', provider: ProviderLike): void;
  (e: 'delete-provider', provider: ProviderLike): void;
  (e: 'add-model-provider', model: string): void;
}>();

const modelSearchProxy = computed({
  get: () => props.modelSearch,
  set: (val) => emit('update:modelSearch', val),
});

const isProviderTesting = (providerId: string) =>
  props.testingProviders.includes(providerId);
</script>

<style scoped>
.models-search {
  max-width: 240px;
}

@media (max-width: 600px) {
  .models-search {
    max-width: 100%;
  }
}
</style>

<style scoped>
.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.cursor-pointer {
  cursor: pointer;
}
</style>
