<script setup lang="ts">
import { ref, watch, computed } from "vue";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import axios from "axios";
import DOMPurify from "dompurify";
import "highlight.js/styles/github-dark.css";
import { useI18n } from "@/i18n/composables";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
});

md.enable(["table", "strikethrough"]);
md.renderer.rules.table_open = () => '<div class="table-container"><table>';
md.renderer.rules.table_close = () => "</table></div>";

md.renderer.rules.fence = (
  tokens: Array<{ info: string; content: string }>,
  idx: number,
  _options: unknown,
  _env: unknown,
  _self: unknown,
) => {
  const token = tokens[idx];
  const lang = token.info.trim() || "";
  const code = token.content;

  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang }).value
      : md.utils.escapeHtml(code);

  return `<div class="code-block-wrapper">
    ${lang ? `<span class="code-lang-label">${lang}</span>` : ""}
    <pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>
  </div>`;
};


const props = defineProps({
  show: { type: Boolean, default: false },
  pluginName: { type: String, default: "" },
  repoUrl: { type: String, default: null },
  mode: {
    type: String,
    default: "readme",
    validator: (value: string) => ["readme", "changelog"].includes(value),
  },
});

const emit = defineEmits(["update:show"]);
const { t, locale } = useI18n();

const content = ref<string | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const isEmpty = ref(false);
const renderedHtml = ref("");
const lastRequestId = ref(0);

function renderMarkdown(markdown: string): string {
  const rawHtml = md.render(markdown);

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "strong",
      "em",
      "del",
      "s",
      "details",
      "summary",
      "div",
      "span",
      "input",
      "button",
      "svg",
      "rect",
      "path",
      "polyline",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "target",
      "rel",
      "type",
      "checked",
      "disabled",
      "open",
      "align",
      "width",
      "height",
      "viewBox",
      "fill",
      "stroke",
      "stroke-width",
      "points",
      "d",
      "x",
      "y",
      "rx",
      "ry",
    ],
  });

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanHtml;
  tempDiv.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href && (href.startsWith("http") || href.startsWith("//"))) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });

  return tempDiv.innerHTML;
}

watch(
  [() => content.value, () => locale?.value],
  ([markdown]) => {
    renderedHtml.value = markdown ? renderMarkdown(markdown) : "";
  },
  { immediate: true },
);

const modeConfig = computed(() => {
  const isChangelog = props.mode === "changelog";
  const keyBase = `core.common.${isChangelog ? "changelog" : "readme"}`;
  return {
    title: t(`${keyBase}.title`),
    loading: t(`${keyBase}.loading`),
    emptyTitle: t(`${keyBase}.empty.title`),
    emptySubtitle: t(`${keyBase}.empty.subtitle`),
    apiPath: `/api/plugin/${isChangelog ? "changelog" : "readme"}`,
  };
});

async function fetchContent() {
  if (!props.pluginName) return;
  const requestId = ++lastRequestId.value;
  loading.value = true;
  content.value = null;
  error.value = null;
  isEmpty.value = false;

  try {
    const res = await axios.get(
      `${modeConfig.value.apiPath}?name=${props.pluginName}`,
    );
    if (requestId !== lastRequestId.value) return;

    if (res.data?.status === "ok") {
      if (res.data?.data?.content) content.value = res.data.data.content;
      else isEmpty.value = true;
    } else {
      error.value = String(res.data?.message ?? "Unknown error");
    }
  } catch (err: unknown) {
    if (requestId === lastRequestId.value) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    if (requestId === lastRequestId.value) loading.value = false;
  }
}

watch(
  [() => props.show, () => props.pluginName, () => props.mode],
  ([show, name]: [boolean, string, string]) => {
    if (show && name) fetchContent();
  },
  { immediate: true },
);

function handleContainerClick(_event: MouseEvent) {
  // Copy button removed by design.
}

const _show = computed({
  get: () => props.show,
  set: (val: boolean) => emit("update:show", val),
});

function openExternalLink(url: string | null) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <v-dialog
    v-model="_show"
    width="800"
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ modeConfig.title }}</span>
        <v-btn
          icon
          variant="text"
          @click="_show = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text style="height: 70vh; overflow-y: auto">
        <div class="d-flex justify-space-between mb-4">
          <v-btn
            v-if="repoUrl"
            color="primary"
            prepend-icon="mdi-github"
            @click="openExternalLink(repoUrl)"
          >
            {{ t("core.common.readme.buttons.viewOnGithub") }}
          </v-btn>
          <v-btn
            color="secondary"
            prepend-icon="mdi-refresh"
            @click="fetchContent"
          >
            {{ t("core.common.readme.buttons.refresh") }}
          </v-btn>
        </div>

        <div
          v-if="loading"
          class="d-flex flex-column align-center justify-center"
          style="height: 100%"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
            class="mb-4"
          />
          <p class="text-body-1 text-center">
            {{ modeConfig.loading }}
          </p>
        </div>

        <div
          v-else-if="renderedHtml"
          class="markdown-body"
          @click="handleContainerClick"
          v-html="renderedHtml"
        />

        <div
          v-else-if="error"
          class="d-flex flex-column align-center justify-center"
          style="height: 100%"
        >
          <v-icon
            size="64"
            color="error"
            class="mb-4"
          >
            mdi-alert-circle-outline
          </v-icon>
          <p class="text-body-1 text-center mb-2">
            {{ t("core.common.error") }}
          </p>
          <p class="text-body-2 text-center text-medium-emphasis">
            {{ error }}
          </p>
        </div>

        <div
          v-else-if="isEmpty"
          class="d-flex flex-column align-center justify-center"
          style="height: 100%"
        >
          <v-icon
            size="64"
            color="warning"
            class="mb-4"
          >
            mdi-file-question-outline
          </v-icon>
          <p class="text-body-1 text-center mb-2">
            {{ modeConfig.emptyTitle }}
          </p>
          <p class="text-body-2 text-center text-medium-emphasis">
            {{ modeConfig.emptySubtitle }}
          </p>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="tonal"
          @click="_show = false"
        >
          {{ t("core.common.close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.markdown-body) {
  --markdown-border: rgba(128, 128, 128, 0.3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
    sans-serif;
  line-height: 1.6;
  padding: 8px 0;
  color: var(--v-theme-secondaryText);
}

:deep(.markdown-body [align="center"]) {
  text-align: center;
}
:deep(.markdown-body [align="right"]) {
  text-align: right;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4),
:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

:deep(.markdown-body h1) {
  font-size: 2em;
  border-bottom: 1px solid var(--v-theme-border);
  padding-bottom: 0.3em;
}
:deep(.markdown-body h2) {
  font-size: 1.5em;
  border-bottom: 1px solid var(--v-theme-border);
  padding-bottom: 0.3em;
}
:deep(.markdown-body p) {
  margin-top: 0;
  margin-bottom: 16px;
}

:deep(.markdown-body .code-block-wrapper) {
  position: relative;
  margin-bottom: 16px;
}
:deep(.markdown-body .code-lang-label) {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 12px;
  color: #8b949e;
  text-transform: uppercase;
  font-weight: 500;
  z-index: 1;
}


:deep(.markdown-body code) {
  padding: 0.2em 0.4em;
  margin: 0;
  background-color: rgba(110, 118, 129, 0.2);
  border-radius: 6px;
  font-size: 85%;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

:deep(.markdown-body pre.hljs) {
  padding: 16px;
  padding-top: 32px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #0d1117;
  border-radius: 6px;
  margin: 0;
}

:deep(.markdown-body pre.hljs code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: #c9d1d9;
}
:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}

:deep(.markdown-body img) {
  max-width: 100%;
  margin: 8px 0;
  box-sizing: border-box;
  background-color: var(--v-theme-background);
  border-radius: 3px;
}

:deep(.markdown-body img[src*="shields.io"]),
:deep(.markdown-body img[src*="badge"]) {
  display: inline-block;
  vertical-align: middle;
  height: auto;
  margin: 2px 4px;
  background-color: transparent;
}

:deep(.markdown-body blockquote) {
  padding: 0 1em;
  color: var(--v-theme-secondaryText);
  border-left: 0.25em solid var(--v-theme-border);
  margin-bottom: 16px;
}

:deep(.markdown-body a) {
  color: var(--v-theme-primary);
  text-decoration: none;
}
:deep(.markdown-body a:hover) {
  text-decoration: underline;
}

:deep(.markdown-body table) {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0;
  border: 1px solid var(--markdown-border);
}
:deep(.markdown-body .table-container) {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 16px;
  border: 1px solid var(--markdown-border);
  border-radius: 6px;
}

:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 6px 13px;
  border: 1px solid var(--markdown-border);
}
:deep(.markdown-body table th) {
  font-weight: 600;
  background-color: rgba(128, 128, 128, 0.1);
}
:deep(.markdown-body table tr) {
  background-color: transparent;
}
:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: rgba(128, 128, 128, 0.05);
}

:deep(.markdown-body hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--v-theme-containerBg);
  border: 0;
}

:deep(.markdown-body details) {
  margin-bottom: 16px;
  border: 1px solid var(--v-theme-border);
  border-radius: 6px;
  padding: 8px 12px;
  background-color: var(--v-theme-surface);
}

:deep(.markdown-body details[open]) {
  padding-bottom: 12px;
}
:deep(.markdown-body summary) {
  cursor: pointer;
  font-weight: 600;
  padding: 4px 0;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.markdown-body summary::before) {
  content: "▶";
  font-size: 0.75em;
  transition: transform 0.2s ease;
}
:deep(.markdown-body details[open] summary::before) {
  transform: rotate(90deg);
}
:deep(.markdown-body summary::-webkit-details-marker) {
  display: none;
}
:deep(.markdown-body details > *:not(summary)) {
  margin-top: 12px;
}

:deep(.markdown-body .hljs-keyword),
:deep(.markdown-body .hljs-selector-tag),
:deep(.markdown-body .hljs-title),
:deep(.markdown-body .hljs-section),
:deep(.markdown-body .hljs-doctag),
:deep(.markdown-body .hljs-name),
:deep(.markdown-body .hljs-strong) {
  font-weight: bold;
}
</style>
