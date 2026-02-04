<template>
  <div
    ref="messageContainer"
    class="messages-container"
    :class="{ 'is-dark': isDark }"
  >
    <!-- 加载指示器 -->
    <div
      v-if="isLoadingMessages"
      class="loading-overlay"
      :class="{ 'is-dark': isDark }"
    >
      <v-progress-circular indeterminate size="48" width="4" color="primary" />
    </div>
    <!-- 聊天消息列表 -->
    <div
      class="message-list"
      :class="{ 'loading-blur': isLoadingMessages }"
      @mouseup="handleTextSelection"
    >
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-item fade-in"
        :class="{ 'is-last-actionable': isLastActionableMessage(index) }"
      >
        <!-- 用户消息 -->
        <div v-if="msg.content.type == 'user'" class="user-message">
          <div class="user-message-content">
            <div
              class="message-bubble user-bubble"
              :class="{
                'has-audio': hasAudio(msg.content.message),
                'has-corner-btn': shouldCollapseUserMsg(msg),
              }"
              :style="{ backgroundColor: isDark ? '#2d2e30' : '#e7ebf4' }"
            >
              <!-- 右上角展开/收起按钮（仅当需要折叠时显示） -->
              <v-btn
                v-if="shouldCollapseUserMsg(msg)"
                icon
                variant="text"
                class="corner-expand-btn"
                :title="
                  isUserMessageExpanded(index)
                    ? t('core.common.collapse') || '收起'
                    : t('core.common.expand') || '展开'
                "
                @click.stop="toggleUserMessage(index)"
              >
                <v-icon size="small">
                  {{
                    isUserMessageExpanded(index)
                      ? 'mdi-chevron-up'
                      : 'mdi-chevron-down'
                  }}
                </v-icon>
              </v-btn>

              <div
                class="collapsible-content"
                :class="{
                  'is-collapsed':
                    shouldCollapseUserMsg(msg) && !isUserMessageExpanded(index),
                }"
              >
                <MessagePartsRenderer
                  :parts="msg.content.message"
                  variant="user"
                  :is-dark="isDark"
                  :is-markdown-dark="isMarkdownDark"
                  :shiki-wasm-ready="shikiWasmReady"
                  :current-time="currentTime"
                  :downloading-files="downloadingFiles"
                  :get-reply-content="getReplyContent"
                  @open-image-preview="$emit('openImagePreview', $event)"
                  @download-file="downloadFile"
                  @scroll-to-message="scrollToMessage"
                />
              </div>
            </div>

            <!-- 用户消息：气泡外（底部）复制按钮 -->
            <div class="user-message-actions">
              <v-btn
                :icon="getCopyIcon(index)"
                size="x-small"
                variant="text"
                class="copy-message-btn"
                :class="{ 'copy-success': isCopySuccess(index) }"
                :title="t('core.common.copy')"
                @click="copyBotMessage(msg.content.message, index)"
              />
            </div>
          </div>
        </div>

        <!-- Bot Messages -->
        <div
          v-else
          class="bot-message"
          :class="{
            'has-reasoning': !!(
              msg.content.reasoning && msg.content.reasoning.trim()
            ),
            'has-bot-icon':
              !(isStreaming && index === messages.length - 1) &&
              messages[index - 1]?.content.type !== 'bot',
          }"
        >
          <v-avatar class="bot-avatar" size="36">
            <v-progress-circular
              v-if="isStreaming && index === messages.length - 1"
              :index="index"
              indeterminate
              size="28"
              width="2"
            />
            <v-icon
              v-else-if="messages[index - 1]?.content.type !== 'bot'"
              size="64"
              color="#8fb6d2"
            >
              mdi-star-four-points-small
            </v-icon>
          </v-avatar>
          <div class="bot-message-content">
            <!-- Reasoning Block (Collapsible) - 移出气泡，便于移动端布局控制 -->
            <ReasoningBlock
              v-if="msg.content.reasoning && msg.content.reasoning.trim()"
              class="bot-reasoning"
              :reasoning="msg.content.reasoning"
              :is-dark="isDark || isMarkdownDark"
              :model-value="isReasoningExpanded(index)"
              @update:model-value="setReasoningExpanded(index, $event)"
            />

            <div class="message-bubble bot-bubble">
              <!-- Loading state -->
              <div v-if="msg.content.isLoading" class="loading-container">
                <span class="loading-text">{{ tm('message.loading') }}</span>
              </div>

              <template v-else>
                <!-- 使用 MessagePartsRenderer 渲染 message parts（含 tool calls 分组），配色跟随主题色 -->
                <MessagePartsRenderer
                  :parts="msg.content.message"
                  :is-dark="isDark"
                  :is-markdown-dark="isMarkdownDark"
                  :shiki-wasm-ready="shikiWasmReady"
                  :current-time="currentTime"
                  :downloading-files="downloadingFiles"
                  @open-image-preview="$emit('openImagePreview', $event)"
                  @download-file="downloadFile"
                />
              </template>
            </div>
            <div v-if="isBotMessageActionable(msg)" class="message-actions">
              <span v-if="msg.created_at" class="message-time">{{
                formatMessageTime(msg.created_at)
              }}</span>
              <!-- Agent Stats Menu -->
              <v-menu
                v-if="msg.content.agentStats"
                location="bottom"
                open-on-hover
                :close-on-content-click="false"
              >
                <template #activator="{ props }">
                  <v-icon v-bind="props" size="x-small" class="stats-info-icon">
                    mdi-information-outline
                  </v-icon>
                </template>
                <v-card
                  class="stats-menu-card"
                  variant="elevated"
                  elevation="3"
                >
                  <v-card-text class="stats-menu-content">
                    <div class="stats-menu-row">
                      <span class="stats-menu-label">{{
                        tm('stats.inputTokens')
                      }}</span>
                      <span class="stats-menu-value">{{
                        getInputTokens(msg.content.agentStats.token_usage)
                      }}</span>
                    </div>
                    <div class="stats-menu-row">
                      <span class="stats-menu-label">{{
                        tm('stats.outputTokens')
                      }}</span>
                      <span class="stats-menu-value">{{
                        msg.content.agentStats.token_usage.output || 0
                      }}</span>
                    </div>
                    <div
                      v-if="msg.content.agentStats.token_usage.input_cached > 0"
                      class="stats-menu-row"
                    >
                      <span class="stats-menu-label">{{
                        tm('stats.cachedTokens')
                      }}</span>
                      <span class="stats-menu-value">{{
                        msg.content.agentStats.token_usage.input_cached
                      }}</span>
                    </div>
                    <div
                      v-if="msg.content.agentStats.time_to_first_token > 0"
                      class="stats-menu-row"
                    >
                      <span class="stats-menu-label">{{
                        tm('stats.ttft')
                      }}</span>
                      <span class="stats-menu-value">{{
                        formatTTFT(msg.content.agentStats.time_to_first_token)
                      }}</span>
                    </div>
                    <div class="stats-menu-row">
                      <span class="stats-menu-label">{{
                        tm('stats.duration')
                      }}</span>
                      <span class="stats-menu-value">{{
                        formatAgentDuration(msg.content.agentStats)
                      }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-menu>
              <v-btn
                :icon="getCopyIcon(index)"
                size="x-small"
                variant="text"
                class="copy-message-btn"
                :class="{ 'copy-success': isCopySuccess(index) }"
                :title="t('core.common.copy')"
                @click="copyBotMessage(msg.content.message, index)"
              />
              <v-btn
                icon="mdi-reply-outline"
                size="x-small"
                variant="text"
                class="reply-message-btn"
                :title="tm('actions.reply')"
                @click="$emit('replyMessage', msg, index)"
              />

              <!-- Refs Visualization -->
              <ActionRef
                :refs="msg.content.refs"
                @open-refs="openRefsSidebar"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动引用按钮 -->
    <div
      v-if="selectedText.content && selectedText.messageIndex !== null"
      class="selection-quote-button"
      :style="{
        top: selectedText.position.top + 'px',
        left: selectedText.position.left + 'px',
        position: 'fixed',
      }"
    >
      <v-btn
        size="large"
        rounded="xl"
        class="quote-btn"
        :class="{ 'dark-mode': isDark }"
        @click="handleQuoteSelected"
      >
        <v-icon left small> mdi-reply </v-icon>
        引用
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { computed } from 'vue';
import { useI18n, useModuleI18n } from '@/i18n/composables';
import {
  MarkdownCodeBlockNode,
  enableKatex,
  enableMermaid,
  setCustomComponents,
} from 'markstream-vue';
import 'markstream-vue/index.css';
import 'katex/dist/katex.min.css';
import axios from 'axios';
import MessagePartsRenderer from '@/components/chat/message_list_comps/MessagePartsRenderer.vue';
import ReasoningBlock from '@/components/chat/message_list_comps/ReasoningBlock.vue';
import RefNode from '@/components/chat/message_list_comps/RefNode.vue';
import ActionRef from '@/components/chat/message_list_comps/ActionRef.vue';
import { shikiWasmReady } from '@/composables/shikiWasm';
import { useCustomizerStore } from '@/stores/customizer';

// 注册自定义 ref 组件
setCustomComponents('message-list', {
  ref: RefNode,
  code_block: MarkdownCodeBlockNode,
});

export default {
  name: 'MessageList',
  components: {
    ReasoningBlock,
    MessagePartsRenderer,
    ActionRef,
  },
  provide() {
    return {
      isDark: this.isDark,
      webSearchResults: () => this.webSearchResults,
    };
  },
  props: {
    messages: {
      type: Array as PropType<any[]>,
      required: true,
    },
    isDark: {
      type: Boolean,
      default: false,
    },
    isStreaming: {
      type: Boolean,
      default: false,
    },
    isLoadingMessages: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['openImagePreview', 'replyMessage', 'replyWithText', 'openRefs'],
  setup() {
    enableKatex();
    enableMermaid();
    const { t } = useI18n();
    const { tm } = useModuleI18n('features/chat');
    const customizer = useCustomizerStore();
    const isMarkdownDark = computed(
      () => customizer.uiTheme === 'PurpleThemeDark',
    );

    return {
      t,
      tm,
      shikiWasmReady,
      isMarkdownDark,
    };
  },
  data() {
    return {
      copiedMessages: new Set(),
      isUserNearBottom: true,
      scrollThreshold: 1,
      scrollTimer: null as any,
      expandedReasoning: new Set(), // Track which reasoning blocks are expanded
      downloadingFiles: new Set<string | number>(), // Track which files are being downloaded
      elapsedTimeTimer: null as any, // Timer for updating elapsed time
      currentTime: Date.now() / 1000, // Current time for elapsed time calculation
      expandedUserMessages: new Set<number>(), // Track which user messages are expanded
      // 选中文本相关状态
      selectedText: {
        content: '',
        messageIndex: null as number | null,
        position: { top: 0, left: 0 },
      },
      // Web search results mapping: { 'uuid.idx': { url, title, snippet } }
      webSearchResults: {} as Record<
        string,
        { url?: string; title?: string; snippet?: string }
      >,
    };
  },
  mounted() {
    this.initCodeCopyButtons();
    this.initImageClickEvents();
    this.addScrollListener();
    this.scrollToBottom();
    this.startElapsedTimeTimer();
    this.extractWebSearchResults();
  },
  updated() {
    this.initCodeCopyButtons();
    this.initImageClickEvents();
    if (this.isUserNearBottom) {
      this.scrollToBottom();
    }
    this.extractWebSearchResults();
  },
  methods: {
    isBotMessageActionable(msg: any): boolean {
      return (
        msg?.content?.type === 'bot' &&
        !msg?.content?.isLoading &&
        ((Array.isArray(msg.content.message) &&
          msg.content.message.length > 0) ||
          (typeof msg.content.reasoning === 'string' &&
            msg.content.reasoning.trim()) ||
          (Array.isArray(msg.content.refs) && msg.content.refs.length > 0) ||
          !!msg.content.agentStats)
      );
    },

    isLastActionableMessage(index: number): boolean {
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.isBotMessageActionable(this.messages[i])) {
          return i === index;
        }
      }
      return false;
    },

    shouldCollapseUserMsg(msg: any): boolean {
      if (!msg || msg?.content?.type !== 'user') return false;
      const parts = msg?.content?.message;
      if (!Array.isArray(parts) || parts.length === 0) return false;

      const text = parts
        .filter(
          (p: any) => (p?.type === 'plain' && p?.text) || p?.type === 'reply',
        )
        .map((p: any) =>
          p?.type === 'reply'
            ? this.getReplyContent(p.message_id)
            : String(p.text ?? ''),
        )
        .join('\n');

      const trimmed = text.trim();
      if (!trimmed) return false;

      const lineCount = trimmed.split(/\r?\n/).length;
      const charCount = trimmed.length;
      return lineCount >= 6 || charCount >= 220;
    },

    toggleUserMessage(messageIndex: number) {
      if (this.expandedUserMessages.has(messageIndex)) {
        this.expandedUserMessages.delete(messageIndex);
      } else {
        this.expandedUserMessages.add(messageIndex);
      }
      // Force reactivity
      this.expandedUserMessages = new Set(this.expandedUserMessages);
    },

    isUserMessageExpanded(messageIndex: number) {
      return this.expandedUserMessages.has(messageIndex);
    },
    // 从消息中提取 web_search_tavily 的搜索结果
    extractWebSearchResults() {
      const results: Record<
        string,
        { url?: string; title?: string; snippet?: string }
      > = {};

      this.messages.forEach((msg: any) => {
        if (msg.content.type !== 'bot' || !Array.isArray(msg.content.message)) {
          return;
        }

        msg.content.message.forEach((part: any) => {
          if (part.type !== 'tool_call' || !Array.isArray(part.tool_calls)) {
            return;
          }

          part.tool_calls.forEach((toolCall: any) => {
            // 检查是否是 web_search_tavily 工具调用
            if (toolCall.name !== 'web_search_tavily' || !toolCall.result) {
              return;
            }

            try {
              // 解析工具调用结果
              const resultData =
                typeof toolCall.result === 'string'
                  ? JSON.parse(toolCall.result)
                  : toolCall.result;

              if (resultData.results && Array.isArray(resultData.results)) {
                resultData.results.forEach((item: any) => {
                  if (item.index != null) {
                    const key = String(item.index);
                    results[key] = {
                      url: item.url,
                      title: item.title,
                      snippet: item.snippet,
                    };
                  }
                });
              }
            } catch (e) {
              console.error('Failed to parse web search result:', e);
            }
          });
        });
      });

      this.webSearchResults = results;
    },

    async copyTextToClipboard(text: string): Promise<boolean> {
      const value = (text ?? '').toString();
      if (!value) return false;

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          return true;
        }
      } catch (err) {
        console.warn('Clipboard API failed, fallback to prompt:', err);
      }

      // 降级方案：弹出 prompt 让用户手动复制（避免使用已弃用 API）
      try {
        window.prompt('复制以下内容（Ctrl+C / Cmd+C）：', value);
        return false;
      } catch {
        return false;
      }
    },
    // 处理文本选择
    handleTextSelection() {
      const selection = window.getSelection();
      const selectedText = selection?.toString() ?? '';

      if (!selectedText.trim()) {
        this.selectedText.content = '';
        this.selectedText.messageIndex = null;
        return;
      }

      if (!selection || selection.rangeCount === 0) {
        this.selectedText.content = '';
        this.selectedText.messageIndex = null;
        return;
      }

      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;
      let node = (startContainer as any)?.parentElement as HTMLElement | null;

      while (node && !node.classList.contains('message-item')) {
        node = node.parentElement;
      }

      const messageItem = node;
      if (!messageItem) {
        this.selectedText.content = '';
        this.selectedText.messageIndex = null;
        return;
      }

      const container = this.getMessageContainerEl();
      const messageItems =
        container?.querySelectorAll<HTMLElement>('.message-item');

      let messageIndex = -1;
      if (messageItems) {
        for (let i = 0; i < messageItems.length; i++) {
          if (messageItems[i] === messageItem) {
            messageIndex = i;
            break;
          }
        }
      }

      if (messageIndex === -1) {
        this.selectedText.content = '';
        this.selectedText.messageIndex = null;
        return;
      }

      const rect = range.getBoundingClientRect();

      this.selectedText.content = selectedText;
      this.selectedText.messageIndex = messageIndex;
      this.selectedText.position = {
        top: Math.max(0, rect.bottom + 5),
        left: Math.max(0, (rect.left + rect.right) / 2),
      };
    },

    // 处理引用选中的文本
    handleQuoteSelected() {
      if (this.selectedText.messageIndex === null) return;

      const msg = this.messages[this.selectedText.messageIndex];
      if (!msg || !msg.id) return;

      this.$emit('replyWithText', {
        messageId: msg.id,
        selectedText: this.selectedText.content,
        messageIndex: this.selectedText.messageIndex,
      });

      this.selectedText.content = '';
      this.selectedText.messageIndex = null;
      window.getSelection()?.removeAllRanges();
    },

    formatPlainPreText(text: string): string {
      const raw = (text ?? '').toString();
      if (!raw) return raw;

      // 1) If it's a single-line command tree (contains ├──/└──), insert newlines.
      if (!raw.includes('\n') && (raw.includes('├──') || raw.includes('└──'))) {
        let s = raw;

        // Normalize spaces so the rules below work reliably.
        s = s.replace(/\s+/g, ' ').trim();

        // Put the root token (e.g. "gh") on its own line when followed by a tree branch.
        // Example: "gh ├── help" => "gh\n├── help"
        s = s.replace(/\b([\w-]+)\s+(?=(?:├──|└──))/g, '$1\n');

        // Newline before each branch marker.
        s = s.replace(/\s*(├──|└──)\s*/g, '\n$1 ');

        // Also split some common Chinese hints into their own lines.
        s = s.replace(/(参数不足。)\s*/g, '$1\n');
        s = s.replace(/(指令组下有如下指令[，,:：]?\s*)/g, '$1\n');

        return s.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
      }

      return raw;
    },

    shouldRenderAsPlainPre(text: string): boolean {
      const trimmed = (text ?? '').trim();

      // Command tree sometimes comes as a single line.
      if (trimmed.includes('├──') || trimmed.includes('└──')) return true;

      if (!trimmed.includes('\n')) return false;

      const lines = trimmed
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 3) return false;

      const cmdLines = lines.filter((l) => l.startsWith('/')).length;
      const logLines = lines.filter(
        (l) =>
          /^\[\d{2}:\d{2}:\d{2}\]/.test(l) || /^\[\d{4}-\d{2}-\d{2}/.test(l),
      ).length;
      const hasBuiltinHeader = lines.some((l) =>
        /内置指令|Built-?in\s+commands/i.test(l),
      );
      const hasCommandTreeHeader = lines.some((l) =>
        /指令组下有如下指令/i.test(l),
      );

      if (hasBuiltinHeader && cmdLines >= 2) return true;
      if (hasCommandTreeHeader) return true;
      if (cmdLines >= Math.max(5, Math.floor(lines.length * 0.5))) return true;
      if (logLines >= 1 && lines.length >= 3) return true;
      return false;
    },

    getMessageContainerEl(): HTMLElement | null {
      const containerRef: any = this.$refs.messageContainer;
      return (containerRef?.$el ?? containerRef) as HTMLElement | null;
    },

    // 检查 message 中是否有音频
    hasAudio(messageParts: unknown) {
      if (!Array.isArray(messageParts)) return false;
      return messageParts.some(
        (part: any) => part.type === 'record' && part.embedded_url,
      );
    },

    // 获取被引用消息的内容
    getReplyContent(messageId: string | number) {
      const replyMsg = this.messages.find((m) => m.id === messageId);
      if (!replyMsg) {
        return this.tm('reply.notFound');
      }
      let content = '';
      if (Array.isArray(replyMsg.content.message)) {
        const textParts = replyMsg.content.message
          .filter((part: any) => part.type === 'plain' && part.text)
          .map((part: any) => part.text);
        content = textParts.join('');
      }
      // 截断过长内容
      if (content.length > 50) {
        content = content.substring(0, 50) + '...';
      }
      return content || '[媒体内容]';
    },

    // 滚动到指定消息
    scrollToMessage(messageId: string | number) {
      const msgIndex = this.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const container = this.getMessageContainerEl();
      const messageItems =
        container?.querySelectorAll<HTMLElement>('.message-item');
      if (messageItems && messageItems[msgIndex]) {
        messageItems[msgIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        // 高亮一下
        messageItems[msgIndex].classList.add('highlight-message');
        setTimeout(() => {
          messageItems[msgIndex].classList.remove('highlight-message');
        }, 2000);
      }
    },

    // Toggle reasoning expansion state
    toggleReasoning(messageIndex: number) {
      if (this.expandedReasoning.has(messageIndex)) {
        this.expandedReasoning.delete(messageIndex);
      } else {
        this.expandedReasoning.add(messageIndex);
      }
      // Force reactivity
      this.expandedReasoning = new Set(this.expandedReasoning);
    },

    setReasoningExpanded(messageIndex: number, expanded: boolean) {
      if (expanded) {
        this.expandedReasoning.add(messageIndex);
      } else {
        this.expandedReasoning.delete(messageIndex);
      }
      this.expandedReasoning = new Set(this.expandedReasoning);
    },

    // Check if reasoning is expanded
    isReasoningExpanded(messageIndex: number) {
      return this.expandedReasoning.has(messageIndex);
    },

    // 下载文件
    async downloadFile(file: any) {
      if (!file.attachment_id) return;

      // 标记为下载中
      this.downloadingFiles.add(file.attachment_id);
      this.downloadingFiles = new Set(this.downloadingFiles);

      try {
        const response = await axios.get(
          `/api/chat/get_attachment?attachment_id=${file.attachment_id}`,
          {
            responseType: 'blob',
          },
        );

        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch (err) {
        console.error('Download file failed:', err);
      } finally {
        this.downloadingFiles.delete(file.attachment_id);
        this.downloadingFiles = new Set(this.downloadingFiles);
      }
    },

    // 复制代码到剪贴板
    async copyCodeToClipboard(code: string) {
      const ok = await this.copyTextToClipboard(code ?? '');
      if (ok) {
        console.log('代码已复制到剪贴板');
      } else {
        console.warn('无法自动复制，已使用降级方案');
      }
    },

    // 复制bot消息到剪贴板
    async copyBotMessage(messageParts: unknown, messageIndex: number) {
      let textToCopy = '';

      if (Array.isArray(messageParts)) {
        // 提取所有文本内容
        const textContents = messageParts
          .filter((part: any) => part.type === 'plain' && part.text)
          .map((part: any) => part.text);
        textToCopy = textContents.join('\n');

        // 检查是否有图片
        const imageCount = messageParts.filter(
          (part: any) => part.type === 'image' && part.embedded_url,
        ).length;
        if (imageCount > 0) {
          if (textToCopy) textToCopy += '\n\n';
          textToCopy += `[包含 ${imageCount} 张图片]`;
        }

        // 检查是否有音频
        const hasAudio = messageParts.some(
          (part: any) => part.type === 'record' && part.embedded_url,
        );
        if (hasAudio) {
          if (textToCopy) textToCopy += '\n\n';
          textToCopy += '[包含音频内容]';
        }
      }

      // 如果没有任何内容，使用默认文本
      if (!textToCopy.trim()) {
        textToCopy = '[媒体内容]';
      }

      const ok = await this.copyTextToClipboard(textToCopy);
      if (ok) {
        console.log('消息已复制到剪贴板');
        this.showCopySuccess(messageIndex);
      } else {
        console.warn('无法自动复制，已使用降级方案');
      }
    },

    // 显示复制成功提示
    showCopySuccess(messageIndex: number) {
      this.copiedMessages.add(messageIndex);

      // 2秒后移除成功状态
      setTimeout(() => {
        this.copiedMessages.delete(messageIndex);
      }, 2000);
    },

    // 获取复制按钮图标
    getCopyIcon(messageIndex: number) {
      return this.copiedMessages.has(messageIndex)
        ? 'mdi-check'
        : 'mdi-content-copy';
    },

    // 检查是否为复制成功状态
    isCopySuccess(messageIndex: number) {
      return this.copiedMessages.has(messageIndex);
    },

    // 获取复制图标SVG
    getCopyIconSvg() {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    },

    // 获取成功图标SVG
    getSuccessIconSvg() {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>';
    },

    // 初始化代码块复制按钮
    initCodeCopyButtons() {
      this.$nextTick(() => {
        const container = this.getMessageContainerEl();
        const buttons =
          container?.querySelectorAll<HTMLElement>('.copy-code-btn') || [];
        buttons.forEach((btn) => btn.remove());
      });
    },

    initImageClickEvents() {
      this.$nextTick(() => {
        // 查找所有动态生成的图片（在markdown-content中）
        const images = document.querySelectorAll<HTMLImageElement>(
          '.markdown-content img',
        );
        images.forEach((img) => {
          if (!img.hasAttribute('data-click-enabled')) {
            img.style.cursor = 'pointer';
            img.setAttribute('data-click-enabled', 'true');
            img.onclick = () => this.$emit('openImagePreview', img.src);
          }
        });
      });
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.getMessageContainerEl();
        if (container) {
          container.scrollTop = container.scrollHeight;
          this.isUserNearBottom = true; // 程序滚动到底部后标记用户在底部
        }
      });
    },

    // 添加滚动事件监听器
    addScrollListener() {
      const container = this.getMessageContainerEl();
      if (container) {
        container.addEventListener('scroll', this.throttledHandleScroll as any);
      }
    },

    // 节流处理滚动事件
    throttledHandleScroll() {
      if (this.scrollTimer) return;

      this.scrollTimer = setTimeout(() => {
        this.handleScroll();
        this.scrollTimer = null;
      }, 50); // 50ms 节流
    },

    // 处理滚动事件
    handleScroll() {
      const containerRef: any = this.$refs.messageContainer;
      const container: any = containerRef?.$el || containerRef;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container as any;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

        // 判断用户是否在底部附近
        this.isUserNearBottom = distanceFromBottom <= this.scrollThreshold;
      }
    },

    // 组件销毁时移除监听器
    beforeUnmount() {
      const containerRef: any = this.$refs.messageContainer;
      const container: any = containerRef?.$el || containerRef;
      if (container && typeof container.removeEventListener === 'function') {
        container.removeEventListener('scroll', this.throttledHandleScroll);
      }
      // 清理定时器
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
        this.scrollTimer = null;
      }
      // 清理 elapsed time 计时器
      if (this.elapsedTimeTimer) {
        clearInterval(this.elapsedTimeTimer);
        this.elapsedTimeTimer = null;
      }
    },

    // 格式化消息时间，支持别名显示
    formatMessageTime(dateStr: string | number | Date) {
      if (!dateStr) return '';

      const date = new Date(dateStr);
      const now = new Date();

      // 获取本地时间的日期部分
      const dateDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const todayDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const yesterdayDay = new Date(todayDay);
      yesterdayDay.setDate(yesterdayDay.getDate() - 1);

      // 格式化时间 HH:MM
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      // 判断是今天、昨天还是更早
      if (dateDay.getTime() === todayDay.getTime()) {
        return `${this.tm('time.today')} ${timeStr}`;
      } else if (dateDay.getTime() === yesterdayDay.getTime()) {
        return `${this.tm('time.yesterday')} ${timeStr}`;
      } else {
        // 更早的日期显示完整格式
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day} ${timeStr}`;
      }
    },

    // Start timer for updating elapsed time
    startElapsedTimeTimer() {
      // Update every 12ms for sub-second precision, then every second after 1s
      const fastUpdateInterval = 12;
      const slowUpdateInterval = 1000;

      const updateTime = () => {
        this.currentTime = Date.now() / 1000;

        // Check if there are any running tool calls
        const hasRunningToolCalls = (this.messages as any[]).some(
          (msg: any) =>
            Array.isArray(msg?.content?.message) &&
            msg.content.message.some(
              (part: any) =>
                part?.type === 'tool_call' &&
                part.tool_calls?.some((tc: any) => !tc.finished_ts),
            ),
        );

        if (hasRunningToolCalls) {
          // Check if any running tool call is under 1 second
          const hasSubSecondToolCall = (this.messages as any[]).some(
            (msg: any) =>
              Array.isArray(msg?.content?.message) &&
              msg.content.message.some(
                (part: any) =>
                  part?.type === 'tool_call' &&
                  part.tool_calls?.some(
                    (tc: any) =>
                      !tc.finished_ts && this.currentTime - tc.ts < 1,
                  ),
              ),
          );

          if (hasSubSecondToolCall) {
            this.elapsedTimeTimer = setTimeout(updateTime, fastUpdateInterval);
          } else {
            this.elapsedTimeTimer = setTimeout(updateTime, slowUpdateInterval);
          }
        } else {
          // No running tool calls, check again after 1 second
          this.elapsedTimeTimer = setTimeout(updateTime, slowUpdateInterval);
        }
      };

      updateTime();
    },

    // Format duration in seconds to human readable string
    formatDuration(seconds: number) {
      if (seconds < 1) {
        return `${Math.round(seconds * 1000)}ms`;
      } else if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
      } else {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
      }
    },

    // Get input tokens (input_other + input_cached)
    getInputTokens(tokenUsage: any) {
      if (!tokenUsage) return 0;
      return (tokenUsage.input_other || 0) + (tokenUsage.input_cached || 0);
    },

    // Format agent duration
    formatAgentDuration(agentStats: any) {
      if (!agentStats) return '';
      const duration = agentStats.end_time - agentStats.start_time;
      return this.formatDuration(duration);
    },

    // Format time to first token
    formatTTFT(ttft: number) {
      if (!ttft || ttft <= 0) return '';
      return this.formatDuration(ttft);
    },

    // Open refs sidebar
    openRefsSidebar(refs: unknown) {
      this.$emit('openRefs', refs);
    },
  },
};
</script>

<style scoped>
:deep(.hr-node) {
  margin-top: 1.25rem;
  margin-bottom: 1.25rem;
  opacity: 0.5;
  border-top-width: 0.3px;
}

:deep(.paragraph-node) {
  margin: 0.5rem 0;
  line-height: 1.7;
  margin-block: 1rem;
}

@media (max-width: 768px) {
  :deep(.node-slot img),
  :deep(.node-content img),
  :deep(img.max-w-96) {
    max-width: 100% !important;
    height: auto !important;
  }
}

@media (hover: none) and (pointer: coarse) {
  :deep(.node-slot img),
  :deep(.node-content img),
  :deep(img.max-w-96) {
    max-width: 100% !important;
    height: auto !important;
  }
}

:deep(.list-node) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.mermaid-block-header) {
  gap: 8px;
}

:deep(code.bg-secondary) {
  background-color: #ececec !important;
  color: #0d0d0d !important;
}

:deep(code.rounded) {
  border-radius: 6px !important;
}

.messages-container.is-dark :deep(code.bg-secondary) {
  background-color: #424242 !important;
  color: #ffffff !important;
}

.messages-container.is-dark :deep(.code-block-container) {
  background-color: #1f1f1f !important;
}

/* 基础动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(0);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.messages-container {
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.7);
  transition: opacity 0.3s ease;
}

.loading-overlay.is-dark {
  background-color: rgba(30, 30, 30, 0.7);
}

.message-list.loading-blur {
  opacity: 0.5;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.message-bubble {
  padding: 2px 16px;
  border-radius: 12px;
}

.loading-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  margin-top: 8px;
}

.loading-text {
  font-size: 14px;
  color: var(--v-theme-secondaryText);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .messages-container {
    padding: 8px;
  }

  .message-list {
    max-width: 100%;
  }

  .message-item {
    padding: 0;
  }

  .message-bubble {
    padding: 2px 12px;
  }

  .bot-message {
    display: grid !important;
    grid-template-columns: 44px 1fr;
    grid-template-rows: auto auto auto;
    column-gap: 8px;
    row-gap: 6px;
    width: 100%;
  }

  .bot-message-content {
    display: contents !important;
  }

  .bot-avatar {
    grid-column: 1;
    grid-row: 1;
    margin-left: 4px;
    position: relative;
    z-index: 2;
  }

  .bot-reasoning {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    width: auto;
    max-width: 100%;
    justify-self: start;
  }

  .bot-message .bot-bubble {
    max-width: none !important;
    box-sizing: border-box;
    margin-left: 0;
    width: 100% !important;
    grid-column: 1 / -1;
    grid-row: 2;
    padding-left: 12px;
    position: relative;
    z-index: 1;
  }

  .bot-message-content > .message-actions {
    grid-column: 1 / -1;
    grid-row: 3;
    margin-left: 0;
  }
}

/* 消息列表样式 */
.message-list {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.message-item {
  margin-bottom: 12px;
  animation: fadeIn 0.3s ease-out;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 12px;
}

.user-message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  width: fit-content;
  max-width: 80%;
}

@media (max-width: 768px) {
  .user-message-content {
    max-width: 100%;
  }
}

/* 用户气泡外的底部操作区（目前仅复制） */
.user-message-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-right: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.user-message:hover .user-message-actions {
  opacity: 1;
}

.user-message:focus-within .user-message-actions {
  opacity: 1;
}

@media (hover: none) {
  .user-message-actions {
    opacity: 1;
  }
}

/* 移动端缩小操作按钮（scoped 下需 deep 选择 Vuetify 组件根元素） */
@media (max-width: 768px), (pointer: coarse) {
  .user-message-actions :deep(.v-btn.v-btn--icon) {
    min-width: 28px;
    width: 28px;
    height: 28px;
    padding: 0;
  }

  .user-message-actions :deep(.v-icon) {
    font-size: 16px;
  }

  .message-actions :deep(.v-btn.v-btn--icon) {
    min-width: 28px;
    width: 28px;
    height: 28px;
    padding: 0;
  }

  .message-actions :deep(.v-icon) {
    font-size: 16px;
  }
}

.bot-message {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 12px;
}

@media (min-width: 769px) {
  .bot-message.has-bot-icon:not(.has-reasoning) .bot-avatar {
    margin-top: 14px;
  }
}

.bot-message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 80%;
  position: relative;
}

.message-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-left: 16px;
}

/* 最后一条消息始终显示操作按钮 */
.message-item:last-child .message-actions {
  opacity: 1;
}

/* 如果最后一条是空占位，则让最后一条“可操作消息”始终显示 */
.message-item.is-last-actionable .message-actions {
  opacity: 1;
}

/* 避免同时显示两条消息的操作区：当悬停非最后一条消息时，隐藏最后一条的操作区 */
.message-item:not(:last-child):hover
  ~ .message-item:last-child
  .message-actions {
  opacity: 0;
}

/* 同理：当悬停非最后一条消息时，隐藏“最后可操作消息”的操作区 */
.message-item:not(.is-last-actionable):hover
  ~ .message-item.is-last-actionable
  .message-actions {
  opacity: 0;
}

.message-time {
  font-size: 12px;
  color: var(--v-theme-secondaryText);
  opacity: 0.7;
  white-space: nowrap;
}

/* Agent Stats Info Icon */
.stats-info-icon {
  margin-left: 6px;
  color: var(--v-theme-secondaryText);
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.stats-info-icon:hover {
  opacity: 1;
}

.bot-message:hover .message-actions {
  opacity: 1;
}

.copy-message-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
  color: var(--v-theme-secondary);
}

.copy-message-btn:hover {
  opacity: 1;
  background-color: rgba(var(--v-theme-secondary), 0.1);
}

.copy-message-btn.copy-success {
  color: #4caf50;
  opacity: 1;
}

.copy-message-btn.copy-success:hover {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.reply-message-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
  color: var(--v-theme-secondary);
}

.reply-message-btn:hover {
  opacity: 1;
  background-color: rgba(var(--v-theme-secondary), 0.1);
}

/* 消息高亮动画 */
.highlight-message {
  animation: highlightPulse 2s ease-out;
}

@keyframes highlightPulse {
  0% {
    background-color: rgba(var(--v-theme-secondary), 0.3);
  }

  100% {
    background-color: transparent;
  }
}

.user-bubble {
  position: relative;
  color: var(--v-theme-primaryText);
  padding: 12px 18px;
  font-size: 15px;
  line-height: 1.6;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  border-radius: 1.5rem;
  border-top-right-radius: 5px;
}

/* 给右上角按钮预留水平空间，避免覆盖第一行/右侧文本 */
.user-bubble.has-corner-btn {
  padding-right: 52px;
}

@media (max-width: 768px) {
  .user-bubble.has-corner-btn {
    padding-right: 48px;
  }
}

/* 清除 pre 默认样式，避免短文本视觉不协调 */
.user-bubble pre {
  margin: 0;
}

/* 允许内容在 flex 容器内正常收缩/换行 */
.user-bubble .collapsible-content {
  min-width: 0;
}

.corner-expand-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  padding: 0 !important;
  aspect-ratio: 1 / 1;
  z-index: 2;
  border-radius: 50% !important;
  color: var(--v-theme-secondary);
  background-color: rgba(var(--v-theme-secondary), 0.08) !important;
}

/* Vuetify v-btn 内部元素没有 scoped 标记，需用 :deep 强制成正圆，避免移动端密度/触控样式把按钮撑成椭圆 */
:deep(.corner-expand-btn .v-btn__content) {
  width: 28px;
  height: 28px;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.corner-expand-btn .v-btn__overlay),
:deep(.corner-expand-btn .v-btn__underlay) {
  border-radius: 50% !important;
}

.corner-expand-btn:hover {
  background-color: rgba(var(--v-theme-secondary), 0.14) !important;
}

/* 折叠容器：默认不限制，折叠时限制约 5 行高度 */
.collapsible-content {
  overflow: visible;
  max-height: none;
  transition: max-height 0.25s ease-out;
}

.collapsible-content.is-collapsed {
  overflow: hidden;
  max-height: calc(5 * 1.6em);
  -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}

/* Shiki/代码块横向滚动：避免长行在展开后被裁剪且无法左右滑动 */
:deep(.code-block-container) {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(pre.shiki) {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* 让 code 保持不换行并产生可滚动宽度（Shiki 通常自带 white-space，但这里做兜底） */
:deep(pre.shiki code) {
  white-space: pre;
  display: block;
  min-width: max-content;
}

.bot-bubble {
  border: 1px solid var(--v-theme-border);
  color: var(--v-theme-primaryText);
  font-size: 16px;
  max-width: 100%;
  padding-left: 12px;
}

.user-avatar {
  align-self: flex-start;
  margin-top: 12px;
}

.bot-avatar {
  align-self: flex-start;
  margin-top: 0;
}

/* 包含音频的消息气泡最小宽度 */
.message-bubble.has-audio {
  min-width: 280px;
}

.audio-player {
  width: 100%;
  height: 36px;
  border-radius: 18px;
}

/* 文件附件样式 */
.file-attachments,
.embedded-files {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-attachment,
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
  max-width: 300px;
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
}

.file-link.is-dark:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}
/* 动画类 */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Reasoning 区块样式 */
.reasoning-container {
  margin-bottom: 12px;
  margin-top: 6px;
  border: 1px solid var(--v-theme-border);
  border-radius: 20px;
  overflow: hidden;
  width: fit-content;
  max-width: 100%;
}

@media (max-width: 768px) {
  /* 移动端限制容器宽度，避免 fit-content 让代码块撑开导致“没有滚动条但溢出屏幕” */
  .reasoning-container {
    width: 100%;
  }
}

.reasoning-header {
  display: inline-flex;
  align-items: center;
  padding: 8px 8px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  border-radius: 20px;
}

.reasoning-header:hover {
  background-color: rgba(58, 106, 183, 0.08);
}

.reasoning-header.is-dark:hover {
  background-color: rgba(58, 108, 183, 0.15);
}

.reasoning-icon {
  margin-right: 6px;
  color: var(--v-theme-secondary);
  transition: transform 0.2s ease;
}

.reasoning-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--v-theme-secondary);
  letter-spacing: 0.3px;
}

.reasoning-content {
  padding: 0px 12px;
  border-top: 1px solid var(--v-theme-border);
  color: gray;
  animation: fadeIn 0.2s ease-in-out;
  font-style: italic;
}

.reasoning-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--v-theme-secondaryText);
}

/* 浮动引用按钮样式 */
.selection-quote-button {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: all;
}

.quote-btn {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  padding: 4px 24px;
  background-color: #f6f4fa !important;
  color: #333333 !important;
}

.quote-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  background-color: #f6f4fa !important;
}

/* 深色主题 */
.quote-btn.dark-mode {
  background-color: #2d2d2d !important;
  color: #ffffff !important;
}
</style>

<style>
.markdown-content {
  max-width: 100%;
  line-height: 1.6;
}

.markdown-content img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

@media (hover: none) and (pointer: coarse) {
  .markdown-content img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
  }
}

/* Stats Menu 样式 */
.stats-menu-card {
  border-radius: 8px !important;
  min-width: 160px;
}

.stats-menu-content {
  padding: 12px 16px !important;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-menu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.stats-menu-label {
  font-size: 13px;
  color: var(--v-theme-secondaryText);
}

.stats-menu-value {
  font-size: 13px;
  font-weight: 600;
  font-family: 'Fira Code', 'Consolas', monospace;
  color: var(--v-theme-primaryText);
}
</style>
