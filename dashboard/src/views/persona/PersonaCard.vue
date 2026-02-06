<template>
  <ItemCard
    :item="persona"
    title-field="persona_id"
    :show-switch="false"
    title-class="text-h3"
    :pin-actions="false"
    :show-edit-button="false"
    :show-delete-button="false"
    class="persona-card-fixed"
    draggable="true"
    @click="$emit('view')"
    @edit="$emit('edit')"
    @delete="$emit('delete')"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <template #item-details="{ item }">
      <div class="content-container">
        <div class="system-prompt-preview mb-2">
          {{ truncateText(item.system_prompt, 100) }}
        </div>

        <div class="tags-container d-flex flex-wrap ga-2">
          <v-chip
            v-if="item.begin_dialogs && item.begin_dialogs.length > 0"
            size="small"
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-chat"
          >
            {{
              tm('labels.presetDialogs', {
                count: item.begin_dialogs.length / 2,
              })
            }}
          </v-chip>

          <v-chip
            v-if="item.tools === null"
            size="small"
            color="success"
            variant="tonal"
            prepend-icon="mdi-tools"
          >
            {{ tm('form.allToolsAvailable') }}
          </v-chip>
          <v-chip
            v-else-if="item.tools && item.tools.length > 0"
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-tools"
          >
            {{ item.tools.length }} {{ tm('persona.toolsCount') }}
          </v-chip>

          <v-chip
            v-if="item.skills === null"
            size="small"
            color="success"
            variant="tonal"
            prepend-icon="mdi-lightning-bolt"
          >
            {{ tm('form.allSkillsAvailable') }}
          </v-chip>
          <v-chip
            v-else-if="item.skills && item.skills.length > 0"
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-lightning-bolt"
          >
            {{ item.skills.length }} {{ tm('persona.skillsCount') }}
          </v-chip>
        </div>
      </div>
    </template>

    <template #footer-start="{ item }">
      <v-tooltip location="bottom" open-delay="300">
        <template #activator="{ props }">
          <div
            v-bind="props"
            class="text-caption text-medium-emphasis ms-2 d-flex align-center cursor-help"
          >
            <v-icon size="small" start class="me-1"> mdi-clock-outline </v-icon>
            {{ formatDate(item.created_at).split(' ')[0] }}
          </div>
        </template>
        <span
          >{{ tm('labels.createdAt') }}: {{ formatDate(item.created_at) }}</span
        >
      </v-tooltip>
    </template>

    <template #actions>
      <v-btn
        variant="tonal"
        color="primary"
        size="small"
        rounded="xl"
        @click.stop="$emit('edit')"
      >
        {{ t('core.common.itemCard.edit') }}
      </v-btn>

      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-dots-horizontal"
            variant="text"
            size="small"
            @click.stop
          />
        </template>
        <v-list density="compact">
          <v-list-item @click="$emit('move')">
            <v-list-item-title>{{
              tm('persona.contextMenu.moveTo')
            }}</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('delete')">
            <v-list-item-title class="text-error">
              {{ t('core.common.itemCard.delete') }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </ItemCard>

  <!-- Custom Drag Preview -->
  <div ref="dragPreview" class="drag-preview">
    <v-icon size="small" class="mr-2"> mdi-account </v-icon>
    <span class="text-subtitle-2">{{ persona.persona_id }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { useI18n, useModuleI18n } from '@/i18n/composables';
import ItemCard from '@/components/shared/ItemCard.vue';

interface Persona {
  persona_id: string;
  system_prompt: string;
  begin_dialogs?: string[] | null;
  tools?: string[] | null;
  skills?: string[] | null;
  created_at?: string;
  updated_at?: string;
  folder_id?: string | null;
  [key: string]: any;
}

export default defineComponent({
  name: 'PersonaCard',
  components: { ItemCard },
  props: {
    persona: {
      type: Object as PropType<Persona>,
      required: true,
    },
  },
  emits: ['view', 'edit', 'move', 'delete'],
  setup() {
    const { t } = useI18n();
    const { tm } = useModuleI18n('features/persona');
    return { t, tm };
  },
  data() {
    return {
      isDragging: false,
    };
  },
  methods: {
    handleDragStart(event: DragEvent) {
      this.isDragging = true;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: 'persona',
            persona_id: this.persona.persona_id,
            persona: this.persona,
          }),
        );

        // Set custom drag image
        const dragPreview = this.$refs.dragPreview as HTMLElement;
        if (dragPreview) {
          event.dataTransfer.setDragImage(dragPreview, 15, 15);
        }
      }
    },
    handleDragEnd() {
      this.isDragging = false;
    },
    truncateText(text: string | undefined | null, maxLength: number): string {
      if (!text) return '';
      return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
    },
    formatDate(dateString: string | undefined | null): string {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString();
    },
  },
});
</script>

<style scoped>
.persona-card-fixed {
  height: 240px !important;
  max-height: 240px !important;
  min-height: 240px !important;
  cursor: pointer;
}

.persona-card-fixed :deep(.v-card-actions) {
  margin: 2px !important;
}

.content-container {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
}

.system-prompt-preview {
  font-size: 13px;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.75);
  word-break: break-all;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  height: 54px;
}

.tags-container {
  align-items: center;
  white-space: normal;
  overflow: visible;
}

.tags-container :deep(.v-chip) {
  border-radius: 999px;
}

.drag-preview {
  position: fixed;
  top: -1000px;
  left: -1000px;
  background: rgb(var(--v-theme-surface));
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  z-index: 9999;
  pointer-events: none;
}
</style>
