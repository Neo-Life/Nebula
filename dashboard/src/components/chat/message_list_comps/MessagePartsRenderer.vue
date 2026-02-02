<template>
    <div class="message-parts-renderer" :style="themeStyle">
    <template v-for="(renderPart, renderIndex) in getRenderParts(parts)" :key="renderPart.key">
        <!-- Grouped Tool Calls (consecutive tool_call parts) -->
        <div v-if="renderPart.type === 'tool_group'" class="tool-call-compact">
            <transition-group name="tool-call-item" tag="div" class="tool-call-items">
                <ToolCallItem v-for="(toolCall, tcIndex) in renderPart.toolCalls" :key="toolCall.id" :is-dark="isDark">
                    <template #label="{ expanded }">
                        <v-icon size="x-small" v-if="toolCall.name.includes('web_search') || toolCall.name.includes('tavily')">
                            mdi-web
                        </v-icon>
                        <v-icon size="x-small" v-else-if="toolCall.name === 'astrbot_execute_shell'">
                            mdi-console-line
                        </v-icon>
                        <v-icon size="x-small" v-else>
                            mdi-wrench
                        </v-icon>
                        {{ tm('actions.toolCallUsed', { name: toolCall.name }) }}
                        <span style="opacity: 0.6;">{{ toolCall.finished_ts ? formatDuration(toolCall.finished_ts -
                            toolCall.ts) : getElapsedTime(toolCall.ts) }}</span>
                        <v-icon size="x-small" class="tool-call-chevron" :class="{ rotated: expanded }">
                            mdi-chevron-right
                        </v-icon>
                    </template>
                    <template #details>
                        <div class="tool-call-detail-row">
                            <span class="detail-label">ID:</span>
                            <code class="detail-value">{{ toolCall.id }}</code>
                        </div>
                        <div class="tool-call-detail-row">
                            <span class="detail-label">Args:</span>
                            <pre class="detail-value detail-json">{{ formatToolArgs(toolCall.args) }}</pre>
                        </div>
                        <div v-if="toolCall.result" class="tool-call-detail-row">
                            <span class="detail-label">Result:</span>
                            <pre
                                class="detail-value detail-json detail-result">{{ formatToolResult(toolCall.result) }}</pre>
                        </div>
                    </template>
                </ToolCallItem>
            </transition-group>
        </div>

        <!-- iPython Tool Block -->
        <ToolCallItem v-else-if="renderPart.type === 'ipython'" :is-dark="isDark" style="margin: 8px 0 4px;">
            <template #label="{ expanded }">
                <v-icon size="x-small">
                    mdi-code-json
                </v-icon>
                <span class="ipython-label">{{ tm('actions.pythonCodeAnalysis') }}</span>
                <span style="opacity: 0.6;">{{ renderPart.toolCall.finished_ts ?
                    formatDuration(renderPart.toolCall.finished_ts -
                        renderPart.toolCall.ts) : getElapsedTime(renderPart.toolCall.ts) }}</span>
                <v-icon size="small" class="ipython-icon" :class="{ rotated: expanded }">
                    mdi-chevron-right
                </v-icon>
            </template>
            <template #details>
                <IPythonToolBlock :tool-call="toIPythonToolCall(renderPart.toolCall)" :is-dark="isDark" :show-header="false"
                    :force-expanded="true" />
            </template>
        </ToolCallItem>

        <!-- Reply -->
        <div
            v-else-if="renderPart.part.type === 'reply' && renderPart.part.message_id != null"
            class="reply-quote"
            @click="emitScrollToMessage(renderPart.part.message_id)"
        >
            <v-icon size="small" class="reply-quote-icon">mdi-reply</v-icon>
            <span class="reply-quote-text">{{ getReplyContentText(renderPart.part.message_id) }}</span>
        </div>

        <!-- Text (User) -->
        <pre
            v-else-if="isUserVariant && renderPart.part.type === 'plain' && renderPart.part.text"
            class="user-plain-pre"
        >{{ renderPart.part.text }}</pre>

        <!-- Text (Markdown) -->
        <MarkdownRender
            v-else-if="renderPart.part.type === 'plain' && renderPart.part.text && renderPart.part.text.trim()"
            custom-id="message-list" :custom-html-tags="['ref']" :content="renderPart.part.text" :typewriter="false"
            class="markdown-content" :is-dark="isDark || isMarkdownDark" :render-code-blocks-as-pre="!shikiWasmReady"
            :monacoOptions="{ theme: (isDark || isMarkdownDark) ? 'vs-dark' : 'vs-light' }" />

        <!-- Image -->
        <div v-else-if="!isUserVariant && renderPart.part.type === 'image' && renderPart.part.embedded_url" class="embedded-images">
            <div class="embedded-image">
                <img :src="renderPart.part.embedded_url" class="bot-embedded-image"
                    @click="emitOpenImage(renderPart.part.embedded_url)" />
            </div>
        </div>

        <div v-else-if="isUserVariant && renderPart.part.type === 'image' && renderPart.part.embedded_url" class="image-attachments">
            <div class="image-attachment">
                <img :src="renderPart.part.embedded_url" class="attached-image"
                    @click="emitOpenImage(renderPart.part.embedded_url)" />
            </div>
        </div>

        <!-- Audio -->
        <div v-else-if="!isUserVariant && renderPart.part.type === 'record' && renderPart.part.embedded_url" class="embedded-audio">
            <audio controls class="audio-player">
                <source :src="renderPart.part.embedded_url" type="audio/wav">
                {{ t('messages.errors.browser.audioNotSupported') }}
            </audio>
        </div>

        <div v-else-if="isUserVariant && renderPart.part.type === 'record' && renderPart.part.embedded_url" class="audio-attachment">
            <audio controls class="audio-player">
                <source :src="renderPart.part.embedded_url" type="audio/wav">
                {{ t('messages.errors.browser.audioNotSupported') }}
            </audio>
        </div>

        <!-- Files -->
        <div v-else-if="!isUserVariant && renderPart.part.type === 'file' && renderPart.part.embedded_file" class="embedded-files">
            <div class="embedded-file">
                <a v-if="renderPart.part.embedded_file.url" :href="renderPart.part.embedded_file.url"
                    :download="renderPart.part.embedded_file.filename" class="file-link" :class="{ 'is-dark': isDark }">
                    <v-icon size="small" class="file-icon">mdi-file-document-outline</v-icon>
                    <span class="file-name">{{ renderPart.part.embedded_file.filename }}</span>
                </a>
                <a v-else @click="emitDownloadFile(renderPart.part.embedded_file)" class="file-link file-link-download"
                    :class="{ 'is-dark': isDark }">
                    <v-icon size="small" class="file-icon">mdi-file-document-outline</v-icon>
                    <span class="file-name">{{ renderPart.part.embedded_file.filename }}</span>
                    <v-icon v-if="renderPart.part.embedded_file.attachment_id != null && downloadingFiles?.has(renderPart.part.embedded_file.attachment_id)" size="small"
                        class="download-icon">mdi-loading mdi-spin</v-icon>
                    <v-icon v-else size="small" class="download-icon">mdi-download</v-icon>
                </a>
            </div>
        </div>

        <div v-else-if="isUserVariant && renderPart.part.type === 'file' && renderPart.part.embedded_file" class="file-attachments">
            <div class="file-attachment">
                <a v-if="renderPart.part.embedded_file.url" :href="renderPart.part.embedded_file.url"
                    :download="renderPart.part.embedded_file.filename" class="file-link" :class="{ 'is-dark': isDark }">
                    <v-icon size="small" class="file-icon">mdi-file-document-outline</v-icon>
                    <span class="file-name">{{ renderPart.part.embedded_file.filename }}</span>
                </a>
                <a v-else @click="emitDownloadFile(renderPart.part.embedded_file)" class="file-link file-link-download"
                    :class="{ 'is-dark': isDark }">
                    <v-icon size="small" class="file-icon">mdi-file-document-outline</v-icon>
                    <span class="file-name">{{ renderPart.part.embedded_file.filename }}</span>
                    <v-icon v-if="renderPart.part.embedded_file.attachment_id != null && downloadingFiles?.has(renderPart.part.embedded_file.attachment_id)" size="small"
                        class="download-icon">mdi-loading mdi-spin</v-icon>
                    <v-icon v-else size="small" class="download-icon">mdi-download</v-icon>
                </a>
            </div>
        </div>
    </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, useModuleI18n } from '@/i18n/composables';
import { MarkdownRender } from 'markstream-vue';
import { useTheme } from 'vuetify'
import IPythonToolBlock from './IPythonToolBlock.vue';
import ToolCallItem from './ToolCallItem.vue';

type ToolCall = {
    id: string
    name: string
    args?: unknown
    result?: unknown
    ts: number
    finished_ts?: number | null
}

type IPythonToolCall = {
    args?: { code?: string } | null
    result?: string | null
}

type MessagePart = {
    type: string
    text?: string
    message_id?: string | number
    embedded_url?: string
    embedded_file?: {
        attachment_id?: string | number
        filename?: string
        url?: string
    } & Record<string, unknown>
    tool_calls?: ToolCall[]
} & Record<string, unknown>

const props = withDefaults(defineProps<{
    parts: MessagePart[]
    isDark?: boolean
    isMarkdownDark?: boolean
    shikiWasmReady?: boolean
    currentTime?: number
    downloadingFiles?: Set<string | number>
    variant?: 'bot' | 'user'
    getReplyContent?: (messageId: string | number) => string
}>(), {
    isDark: false,
    isMarkdownDark: false,
    shikiWasmReady: true,
    currentTime: 0,
    downloadingFiles: () => new Set<string | number>(),
    variant: 'bot',
})

const emit = defineEmits<{
    (e: 'open-image-preview', url: string): void
    (e: 'download-file', file: any): void
    (e: 'scroll-to-message', messageId: string | number): void
}>();
const { t } = useI18n();
const { tm } = useModuleI18n('features/chat');

const theme = useTheme()

// Read project theme colors and expose as CSS variables for styling.
const themeStyle = computed(() => {
    const colors = theme.global.current.value.colors
    return {
        '--mp-primary': colors?.primary ?? '',
        '--mp-secondary': colors?.secondary ?? '',
        '--mp-surface': colors?.surface ?? '',
    } as Record<string, string>
})

function toIPythonToolCall(toolCall: ToolCall): IPythonToolCall {
    const args = toolCall.args as IPythonToolCall['args']

    let result: string | null = null
    if (typeof toolCall.result === 'string') {
        result = toolCall.result
    } else if (toolCall.result != null) {
        try {
            result = JSON.stringify(toolCall.result)
        } catch {
            result = String(toolCall.result)
        }
    }

    return { args, result }
}

const emitOpenImage = (url: string) => {
    emit('open-image-preview', url);
};

const emitDownloadFile = (file: any) => {
    emit('download-file', file);
};

const emitScrollToMessage = (messageId: string | number) => {
    emit('scroll-to-message', messageId)
}

const isUserVariant = computed(() => props.variant === 'user')

const getReplyContentText = (messageId: string | number) => {
    if (typeof props.getReplyContent === 'function') {
        return props.getReplyContent(messageId)
    }
    return '[媒体内容]'
}

const formatDuration = (seconds: number) => {
    if (seconds < 1) {
        return `${Math.round(seconds * 1000)}ms`;
    }
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
};

const getElapsedTime = (startTs: number) => {
    const elapsed = props.currentTime - startTs;
    return formatDuration(elapsed);
};

const formatToolResult = (result: unknown) => {
    if (!result) return '';
    if (typeof result === 'string') {
        try {
            const parsed = JSON.parse(result);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return result;
        }
    }
    return JSON.stringify(result, null, 2);
};

const formatToolArgs = (args: unknown) => {
    if (!args) return '';
    if (typeof args === 'string') {
        try {
            const parsed = JSON.parse(args);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return args;
        }
    }
    return JSON.stringify(args, null, 2);
};

const isIPythonTool = (toolCall: ToolCall) => {
    return toolCall.name === 'astrbot_execute_ipython' || toolCall.name === 'astrbot_execute_python';
};

type RenderPart =
    | { type: 'tool_group'; toolCalls: ToolCall[]; key: string }
    | { type: 'ipython'; toolCall: ToolCall; key: string }
    | { type: 'part'; part: MessagePart; key: string }

const getRenderParts = (messageParts: unknown): RenderPart[] => {
    if (!Array.isArray(messageParts)) return [];
    const rendered: RenderPart[] = [];
    let pendingToolCalls: ToolCall[] = [];
    let groupIndex = 0;

    const flushPending = (endIndex: number) => {
        if (!pendingToolCalls.length) return;
        rendered.push({
            type: 'tool_group',
            toolCalls: pendingToolCalls,
            key: `tool-group-${groupIndex}-${endIndex}`
        });
        pendingToolCalls = [];
        groupIndex += 1;
    };

    (messageParts as any[]).forEach((part, idx) => {
        if (part?.type === 'tool_call' && Array.isArray(part.tool_calls) && part.tool_calls.length) {
            (part.tool_calls as ToolCall[]).forEach((toolCall: ToolCall, tcIndex: number) => {
                if (isIPythonTool(toolCall)) {
                    flushPending(idx - 1);
                    rendered.push({
                        type: 'ipython',
                        toolCall,
                        key: `ipython-${idx}-${tcIndex}`
                    });
                    return;
                }

                pendingToolCalls.push(toolCall);
            });
            return;
        }

        flushPending(idx - 1);
        rendered.push({
            type: 'part',
            part,
            key: `part-${idx}`
        });
    });

    flushPending(messageParts.length - 1);
    return rendered;
};
</script>

<style scoped>
.message-parts-renderer {
    max-width: 100%;
    min-width: 0;
}

/* Reply Quote */
.reply-quote {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    margin-bottom: 8px;
    background-color: rgba(var(--v-theme-secondary), 0.08);
    border-left: 3px solid var(--v-theme-secondary);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.reply-quote:hover {
    background-color: rgba(var(--v-theme-secondary), 0.15);
}

.reply-quote-icon {
    color: var(--v-theme-secondary);
    flex-shrink: 0;
}

.reply-quote-text {
    font-size: 13px;
    color: var(--v-theme-secondaryText);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* User plain text */
.user-plain-pre {
    margin: 0;
    font-family: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: anywhere;
}

/* User image attachments */
.image-attachments {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
}

.image-attachment {
    position: relative;
    display: inline-block;
}

.attached-image {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
}

@media (max-width: 768px) {
    .image-attachments {
        flex-direction: column;
        align-items: flex-start;
    }

    .image-attachment {
        max-width: 100%;
    }

    .attached-image {
        width: 100%;
        max-width: 72vw;
        height: auto;
        max-height: 45vh;
        object-fit: contain;
    }
}

@media (hover: none) and (pointer: coarse) {
    .image-attachments {
        flex-direction: column;
        align-items: flex-start;
    }

    .image-attachment {
        max-width: 100%;
    }

    .attached-image {
        width: 100%;
        max-width: 72vw;
        height: auto;
        max-height: 45vh;
        object-fit: contain;
    }
}

/* User audio attachment */
.audio-attachment {
    margin-top: 8px;
    width: 100%;
    min-width: 0;
    max-width: 100%;
}

.audio-player {
    width: 100%;
    height: 36px;
    border-radius: 18px;
}

/* User files */
.file-attachments {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.file-attachment {
    display: flex;
    align-items: center;
}

/* Images */
.embedded-images {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.embedded-image {
    display: flex;
    justify-content: flex-start;
}

.bot-embedded-image {
    max-width: 40%;
    width: auto;
    height: auto;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

@media (max-width: 768px) {
    .bot-embedded-image {
        max-width: 85%;
    }
}

@media (hover: none) and (pointer: coarse) {
    .bot-embedded-image {
        max-width: 85%;
    }
}

/* Audio */
.embedded-audio {
    width: 100%;
    max-width: 300px;
    margin-top: 8px;
}

.embedded-audio .audio-player {
    width: 100%;
    max-width: 300px;
    height: 36px;
    border-radius: 18px;
}

/* Files */
.embedded-files {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.embedded-file {
    display: flex;
    align-items: center;
}

.file-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background-color: rgba(var(--v-theme-primary), 0.08);
    border: 1px solid rgba(var(--v-theme-primary), 0.2);
    border-radius: 8px;
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
    font-size: 14px;
    transition: all 0.2s ease;
    max-width: min(300px, 100%);
    min-width: 0;
}

.file-link-download {
    cursor: pointer;
}

.download-icon {
    margin-left: 4px;
    opacity: 0.7;
}

.file-icon {
    flex-shrink: 0;
    color: rgb(var(--v-theme-primary));
}

.file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.file-link.is-dark {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--v-theme-secondary);
}

.file-link.is-dark .file-icon {
    color: var(--v-theme-secondary);
}

.file-link.is-dark:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}

.tool-call-compact {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 8px 0 4px;
}

.tool-call-group-title {
    font-size: 13px;
    color: var(--v-theme-secondaryText);
    opacity: 0.7;
}

.tool-call-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tool-call-detail-row {
    display: flex;
    flex-direction: column;
    margin-bottom: 6px;
}

.tool-call-detail-row:last-child {
    margin-bottom: 0;
}

.detail-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--v-theme-secondaryText);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.detail-value {
    font-size: 12px;
    color: var(--v-theme-primaryText);
    background-color: transparent;
    padding: 2px 6px;
    border-radius: 4px;
    word-break: break-word;
}

.detail-json {
    font-family: 'Fira Code', 'Consolas', monospace;
    white-space: pre-wrap;
    max-height: 220px;
    overflow-y: auto;
    margin: 0;
}

.detail-result {
    max-height: 320px;
    background-color: transparent;
}

.tool-call-item-enter-active,
.tool-call-item-leave-active {
    transition: all 0.2s ease;
}

.tool-call-item-enter-from,
.tool-call-item-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.ipython-icon,
.tool-call-chevron {
    margin-left: 6px;
    transition: transform 0.2s ease;
}

.ipython-icon.rotated {
    transform: rotate(90deg);
}

.tool-call-chevron.rotated {
    transform: rotate(90deg);
}
</style>
