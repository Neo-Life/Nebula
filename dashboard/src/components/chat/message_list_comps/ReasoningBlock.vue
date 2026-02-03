<template>
  <div
    class="reasoning-card"
    :class="{ 'is-expanded': isExpanded, 'is-collapsed': !isExpanded }"
    :style="{ backgroundColor: isDark ? '#2d2e30' : '#e7ebf4' }"
  >
    <div
      class="reasoning-header"
      role="button"
      tabindex="0"
      :aria-expanded="isExpanded"
      @click="toggleExpanded"
      @keydown.enter.prevent="toggleExpanded"
      @keydown.space.prevent="toggleExpanded"
    >
      <v-icon
        size="small"
        class="reasoning-chevron"
        :class="{ 'rotate-90': isExpanded }"
      >
        mdi-chevron-right
      </v-icon>
      <span class="reasoning-title">{{ tm('reasoning.thinking') }}</span>
    </div>
    <div
      v-if="isExpanded"
      class="reasoning-content animate-fade-in"
    >
      <MarkdownRender
        :key="shikiWasmReady ? 'shiki' : 'pre'"
        :content="reasoning"
        class="reasoning-text markdown-content"
        :typewriter="false"
        :is-dark="isDark"
        :render-code-blocks-as-pre="!shikiWasmReady"
        :class="{ dark: isDark }"
        :style="isDark ? { opacity: '0.85' } : {}"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useModuleI18n } from '@/i18n/composables';
import { MarkdownRender } from 'markstream-vue';
import 'markstream-vue/index.css';
import 'katex/dist/katex.min.css';
import { shikiWasmReady } from '@/composables/shikiWasm';

const props = withDefaults(
    defineProps<{
        reasoning: string;
        isDark?: boolean;
        initialExpanded?: boolean;
        modelValue?: boolean;
    }>(),
    {
        isDark: false,
        initialExpanded: false
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
}>();

const { tm } = useModuleI18n('features/chat');
const uncontrolledExpanded = ref<boolean>(props.initialExpanded);

const isExpanded = computed<boolean>({
    get() {
        return props.modelValue ?? uncontrolledExpanded.value;
    },
    set(value) {
        if (props.modelValue === undefined) {
            uncontrolledExpanded.value = value;
            return;
        }
        emit('update:modelValue', value);
    }
});

const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
.reasoning-card {
    margin: 0 0 12px;
    border: none;
    border-radius: 16px;
    overflow: hidden;
    width: fit-content;
    max-width: 100%;
    box-shadow: none;
}

.reasoning-card.is-collapsed {
    border-radius: 9999px;
}

@media (max-width: 768px) {
    .reasoning-card.is-expanded {
        width: 100%;
    }
}

.reasoning-header {
    display: inline-flex;
    align-items: center;
    width: 100%;
    gap: 6px;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
    border-radius: 16px;
    outline: none;
    color: rgba(var(--v-theme-on-surface), 0.78);
}

.reasoning-card.is-collapsed .reasoning-header {
    padding: 7px 14px;
    border-radius: 9999px;
}

.reasoning-header:hover {
    background-color: transparent;
}

.reasoning-header:focus-visible {
    outline: 2px solid var(--v-theme-border);
    outline-offset: 2px;
}

.reasoning-chevron {
    color: currentColor;
    transition: transform 0.2s ease;
}

.reasoning-title {
    font-size: 13px;
    font-weight: 600;
    color: inherit;
    letter-spacing: 0.2px;
}

.reasoning-content {
    padding: 10px 12px;
    border-top: 2px solid rgba(var(--v-theme-on-surface), 0.10);
    color: rgba(var(--v-theme-on-surface), 0.78);
    animation: fadeIn 0.2s ease-in-out;
    max-width: 100%;
    overflow-x: auto;
}

.reasoning-text {
    font-size: 14px;
    line-height: 1.65;
    color: inherit;
}

.reasoning-text :deep(pre),
.reasoning-text :deep(code) {
    max-width: 100%;
}

.reasoning-text :deep(pre) {
    overflow-x: auto;
}

.animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.rotate-90 {
    transform: rotate(90deg);
}
</style>
