<template>
  <div
    v-if="usedRefs.length > 0"
    class="refs-container"
    @click="handleClick"
  >
    <div class="refs-avatars">
      <div
        v-for="(ref, refIdx) in usedRefs.slice(0, 3)"
        :key="refIdx"
        class="ref-avatar"
        :style="{ zIndex: 3 - refIdx }"
      >
        <img
          v-if="ref.favicon"
          :src="ref.favicon"
          class="ref-favicon"
          @error="handleFaviconError"
        >
        <span
          v-else
          class="ref-initial"
        >{{ getRefInitial(ref.title) }}</span>
      </div>
      <span
        v-if="usedRefs.length > 3"
        class="refs-more"
      >
        +{{ usedRefs.length - 3 }}
      </span>
      <span
        class="ml-2"
        style="color: gray;"
      >
        {{ tm('refs.sources') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useModuleI18n } from '@/i18n/composables';

type RefItem = {
    title?: string;
    url?: string;
    favicon?: string;
};

type RefsPayload = {
    used?: RefItem[];
} | null;

const props = defineProps<{ refs?: RefsPayload }>();
const emit = defineEmits<{ 'open-refs': [refs: RefsPayload] }>();

const { tm } = useModuleI18n('features/chat');

const usedRefs = computed(() => props.refs?.used ?? []);

function getRefInitial(title?: string): string {
    if (!title) return '?';
    return title.charAt(0).toUpperCase();
}

function handleClick() {
    emit('open-refs', props.refs ?? null);
}

function handleFaviconError(event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (target) {
        target.style.display = 'none';
    }
}
</script>

<style scoped>
.refs-container {
    display: flex;
    align-items: center;
    margin-left: 8px;
    padding: 4px 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color;
}

.refs-container:hover {
    background-color: rgba(103, 58, 183, 0.08);
}

.refs-avatars {
    display: flex;
    align-items: center;
    position: relative;
}

.ref-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    opacity: 0.9;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
}

.ref-avatar:not(:first-child) {
    margin-left: -8px;
}

.ref-favicon {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ref-initial {
    font-size: 10px;
    font-weight: 600;
    color: white;
    user-select: none;
}

.refs-more {
    margin-left: 6px;
    font-size: 11px;
    color: var(--v-theme-secondaryText);
    opacity: 0.7;
    font-weight: 500;
}
</style>
