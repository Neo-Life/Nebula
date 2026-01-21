<template>
    <ItemCard :item="folder" title-field="name" :show-switch="false" title-class="text-h3" :show-edit-button="false"
        :show-delete-button="false" :pin-actions="false" :no-padding="true" class="folder-card-fixed"
        :class="{ 'drag-over': isDragOver }"
        @click="$emit('click')"
        @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleDrop">
        <template #item-details>
            <div class="folder-content-container">
                <div class="d-flex align-center">
                    <v-icon size="40" color="amber-darken-2" class="mr-3">mdi-folder</v-icon>
                    <div class="folder-info flex-grow-1 overflow-hidden">
                        <div v-if="folder.description" class="text-body-2 text-medium-emphasis text-truncate">
                            {{ folder.description }}
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <template #actions>
            <v-btn variant="tonal" color="secondary" size="small" rounded="xl" @click.stop="$emit('open')">
                {{ tm('folder.contextMenu.open') }}
            </v-btn>
            <v-btn variant="tonal" color="primary" size="small" rounded="xl" @click.stop="$emit('rename')">
                {{ tm('folder.contextMenu.rename') }}
            </v-btn>
            <v-btn variant="tonal" color="primary" size="small" rounded="xl" @click.stop="$emit('move')">
                {{ tm('folder.contextMenu.moveTo') }}
            </v-btn>
            <v-btn variant="outlined" color="error" size="small" rounded="xl" @click.stop="$emit('delete')">
                {{ tm('folder.contextMenu.delete') }}
            </v-btn>
        </template>
    </ItemCard>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { useModuleI18n } from '@/i18n/composables';
import type { Folder } from '@/components/folder/types';
import ItemCard from '@/components/shared/ItemCard.vue';

export default defineComponent({
    name: 'FolderCard',
    components: { ItemCard },
    props: {
        folder: {
            type: Object as PropType<Folder>,
            required: true
        }
    },
    emits: ['click', 'contextmenu', 'open', 'rename', 'move', 'delete', 'persona-dropped'],
    setup() {
        const { tm } = useModuleI18n('features/persona');
        return { tm };
    },
    data() {
        return {
            isDragOver: false
        };
    },
    methods: {
        handleDragOver(event: DragEvent) {
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
            this.isDragOver = true;
        },
        handleDragLeave() {
            this.isDragOver = false;
        },
        handleDrop(event: DragEvent) {
            this.isDragOver = false;
            if (!event.dataTransfer) return;
            
            try {
                const data = JSON.parse(event.dataTransfer.getData('application/json'));
                if (data.type === 'persona') {
                    this.$emit('persona-dropped', {
                        persona_id: data.persona_id,
                        target_folder_id: this.folder.folder_id
                    });
                }
            } catch (e) {
                console.error('Failed to parse drop data:', e);
            }
        }
    }
});
</script>

<style scoped>
.folder-card-fixed {
    height: 240px !important;
    max-height: 240px !important;
    min-height: 240px !important;
    cursor: pointer;
}

.folder-card-fixed :deep(.v-card-actions) {
    margin: 4px !important;
}

.folder-card-fixed.drag-over {
    background-color: rgba(var(--v-theme-primary), 0.15);
    border: 3px dashed rgb(var(--v-theme-primary));
    transform: scale(1.02);
}

.folder-content-container {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
}

.folder-info {
    min-width: 0;
}
</style>
