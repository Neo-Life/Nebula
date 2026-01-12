<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { MarkdownRender, enableKatex, enableMermaid } from 'markstream-vue';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

import { proxyBadgeUrls } from '@/utils/markdown';

enableKatex();
enableMermaid();

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    content: string;
    typewriter?: boolean;
    preprocessBadges?: boolean;
  }>(),
  {
    typewriter: false,
    preprocessBadges: true,
  },
);

const attrs = useAttrs();

const forwardedAttrs = computed(() => {
  const { class: _klass, ...rest } = attrs as Record<string, unknown>;
  return rest;
});

const normalizedContent = computed(() => {
  if (!props.preprocessBadges) return props.content;
  return proxyBadgeUrls(props.content);
});

const mergedClass = computed(() => {
  const klass = attrs.class;
  return ['markdown-content', klass].filter(Boolean);
});
</script>

<template>
  <div class="markdown-body">
    <MarkdownRender
      v-bind="forwardedAttrs"
      :content="normalizedContent"
      :typewriter="typewriter"
      :render-code-blocks-as-pre="true"
      :class="mergedClass"
    />
  </div>
</template>
