<template>
  <div
    class="input-area fade-in"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div
      class="input-container"
      :style="{
        width: '85%',
        maxWidth: '900px',
        margin: '0 auto',
        border: isDark ? 'none' : '1px solid #e0e0e0',
        borderRadius: '24px',
        boxShadow: isDark ? 'none' : '0px 2px 2px rgba(0, 0, 0, 0.1)',
        backgroundColor: isDark ? '#2d2d2d' : 'transparent',
        position: 'relative',
      }"
    >
      <!-- 拖拽上传遮罩 -->
      <transition name="fade">
        <div v-if="isDragging" class="drop-overlay">
          <div class="drop-overlay-content">
            <v-icon size="48" color="primary"> mdi-cloud-upload </v-icon>
            <span class="drop-text">{{ tm('input.dropToUpload') }}</span>
          </div>
        </div>
      </transition>
      <!-- 引用预览区 -->
      <transition name="slideReply" @after-leave="handleReplyAfterLeave">
        <div v-if="props.replyTo && !isReplyClosing" class="reply-preview">
          <div class="reply-content">
            <v-icon size="small" class="reply-icon"> mdi-reply </v-icon>
            "<span class="reply-text">{{
              props.replyTo.selectedText || props.replyTo.messageContent
            }}</span
            >"
          </div>
          <v-btn
            class="remove-reply-btn"
            icon="mdi-close"
            size="x-small"
            color="grey"
            variant="text"
            @click="handleClearReply"
          />
        </div>
      </transition>
      <div class="textarea-wrapper">
        <v-btn
          v-if="showExpandButton"
          class="expand-input-btn"
          icon
          variant="text"
          size="x-small"
          :title="
            isInputExpanded
              ? t('core.common.collapse') || '收起'
              : t('core.common.expand') || '展开'
          "
          @click="toggleInputExpanded"
        >
          <v-icon size="small">
            {{ isInputExpanded ? 'mdi-arrow-collapse' : 'mdi-arrow-expand' }}
          </v-icon>
        </v-btn>

        <textarea
          ref="inputField"
          v-model="localPrompt"
          :disabled="disabled"
          placeholder="Ask Nebula..."
          class="chat-input-textarea"
          :style="textareaStyle"
          @input="handleInput"
          @keydown="handleKeyDown"
        />
      </div>
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 14px;
        "
      >
        <div
          style="
            display: flex;
            justify-content: flex-start;
            margin-top: 4px;
            align-items: center;
            gap: 8px;
          "
        >
          <!-- Settings Menu -->
          <StyledMenu
            offset="8"
            location="top start"
            :close-on-content-click="false"
          >
            <template #activator="{ props: activatorProps }">
              <v-btn
                v-bind="activatorProps"
                icon="mdi-plus"
                variant="text"
                class="input-action-btn"
              />
            </template>

            <!-- Upload Files -->
            <v-list-item
              class="styled-menu-item"
              rounded="md"
              @click="triggerImageInput"
            >
              <template #prepend>
                <v-icon icon="mdi-file-upload-outline" size="small" />
              </template>
              <v-list-item-title>
                {{ tm('input.upload') }}
              </v-list-item-title>
            </v-list-item>

            <!-- Config Selector in Menu -->
            <ConfigSelector
              :session-id="sessionId || null"
              :platform-id="sessionPlatformId"
              :is-group="sessionIsGroup"
              :initial-config-id="props.configId"
              @config-changed="handleConfigChange"
            />

            <!-- Streaming Toggle in Menu -->
            <v-list-item
              class="styled-menu-item"
              rounded="md"
              @click="$emit('toggleStreaming')"
            >
              <template #prepend>
                <v-icon
                  :icon="enableStreaming ? 'mdi-flash' : 'mdi-flash-off'"
                  size="small"
                />
              </template>
              <v-list-item-title>
                {{
                  enableStreaming
                    ? tm('streaming.enabled')
                    : tm('streaming.disabled')
                }}
              </v-list-item-title>
            </v-list-item>
          </StyledMenu>

          <!-- Provider/Model Selector Menu -->
          <ProviderModelMenu
            v-if="showProviderSelector"
            ref="providerModelMenuRef"
          />
        </div>
        <div
          style="
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
            align-items: center;
          "
        >
          <input
            ref="imageInputRef"
            type="file"
            style="display: none"
            multiple
            @change="handleFileSelect"
          />
          <v-progress-circular
            v-if="disabled"
            indeterminate
            size="16"
            class="mr-1"
            width="1.5"
          />
          <v-btn
            :icon="isRecording ? 'mdi-stop-circle' : 'mdi-microphone'"
            variant="text"
            :color="isRecording ? 'error' : undefined"
            :class="['record-btn', { 'input-action-btn': !isRecording }]"
            size="small"
            @click="handleRecordClick"
          />
          <v-btn
            icon="mdi-send"
            variant="text"
            :disabled="!canSend"
            class="send-btn input-action-btn"
            size="small"
            @click="$emit('send')"
          />
        </div>
      </div>
    </div>
    <div
      v-if="
        stagedImagesUrl.length > 0 ||
        stagedAudioUrl ||
        (stagedFiles && stagedFiles.length > 0)
      "
      class="attachments-preview"
    >
      <div
        v-for="(img, index) in stagedImagesUrl"
        :key="'img-' + index"
        class="image-preview"
      >
        <img :src="img" class="preview-image" />
        <v-btn
          class="remove-attachment-btn"
          icon="mdi-close"
          size="small"
          color="error"
          variant="text"
          @click="$emit('removeImage', index)"
        />
      </div>

      <div v-if="stagedAudioUrl" class="audio-preview">
        <v-chip color="lightsecondary" class="audio-chip">
          <v-icon start icon="mdi-microphone" size="small" />
          {{ tm('voice.recording') }}
        </v-chip>
        <v-btn
          class="remove-attachment-btn"
          icon="mdi-close"
          size="small"
          color="error"
          variant="text"
          @click="$emit('removeAudio')"
        />
      </div>

      <div
        v-for="(file, index) in stagedFiles"
        :key="'file-' + index"
        class="file-preview"
      >
        <v-chip color="blue-grey-lighten-4" class="file-chip">
          <v-icon start icon="mdi-file-document-outline" size="small" />
          <span class="file-name-preview">{{ file.original_name }}</span>
        </v-chip>
        <v-btn
          class="remove-attachment-btn"
          icon="mdi-close"
          size="small"
          color="error"
          variant="text"
          @click="$emit('removeFile', index)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { useI18n, useModuleI18n } from '@/i18n/composables';
import { useCustomizerStore } from '@/stores/customizer';
import ConfigSelector from './ConfigSelector.vue';
import ProviderModelMenu from './ProviderModelMenu.vue';
import StyledMenu from '@/components/shared/StyledMenu.vue';
import type { Session } from '@/composables/useSessions';

interface StagedFileInfo {
  attachment_id: string;
  filename: string;
  original_name: string;
  url: string;
  type: string;
}

interface ReplyInfo {
  messageId: number;
  selectedText?: string;
  messageContent?: string;
}

interface Props {
  prompt: string;
  stagedImagesUrl: string[];
  stagedAudioUrl: string;
  stagedFiles?: StagedFileInfo[];
  disabled: boolean;
  enableStreaming: boolean;
  isRecording: boolean;
  sessionId?: string | null;
  currentSession?: Session | null;
  configId?: string | null;
  replyTo?: ReplyInfo | null;
}

const props = withDefaults(defineProps<Props>(), {
  sessionId: null,
  currentSession: null,
  configId: null,
  stagedFiles: () => [],
  replyTo: null,
});

const emit = defineEmits<{
  'update:prompt': [value: string];
  send: [];
  toggleStreaming: [];
  removeImage: [index: number];
  removeAudio: [];
  removeFile: [index: number];
  startRecording: [];
  stopRecording: [];
  pasteImage: [event: ClipboardEvent];
  fileSelect: [files: FileList];
  clearReply: [];
  openLiveMode: [];
}>();

const { tm } = useModuleI18n('features/chat');
const { t } = useI18n();
const isDark = computed(
  () => useCustomizerStore().uiTheme === 'PurpleThemeDark',
);

const inputField = ref<HTMLTextAreaElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const providerModelMenuRef = ref<InstanceType<typeof ProviderModelMenu> | null>(
  null,
);
const showProviderSelector = ref(true);
const isReplyClosing = ref(false);
const isDragging = ref(false);
let dragLeaveTimeout: number | null = null;

const localPrompt = computed({
  get: () => props.prompt,
  set: (value) => emit('update:prompt', value),
});

const sessionPlatformId = computed(
  () => props.currentSession?.platform_id || 'webchat',
);
const sessionIsGroup = computed(() => Boolean(props.currentSession?.is_group));

const canSend = computed(() => {
  return (
    (props.prompt && props.prompt.trim()) ||
    props.stagedImagesUrl.length > 0 ||
    props.stagedAudioUrl ||
    (props.stagedFiles && props.stagedFiles.length > 0)
  );
});

// 输入区展开/收起（内容较多时显示按钮）
const isInputExpanded = ref(false);
const showExpandButton = computed(() => {
  const text = (props.prompt ?? '').toString();
  if (isInputExpanded.value) return true;
  const lineCount = text.split(/\r?\n/).length;
  return lineCount >= 5 || text.length >= 180;
});

// 未展开时自动高度（随内容增长/缩回）
const COLLAPSED_MIN_HEIGHT = 40;
const COLLAPSED_MAX_HEIGHT = 200;
const collapsedHeightPx = ref<number>(COLLAPSED_MIN_HEIGHT);
const collapsedOverflowY = ref<'hidden' | 'auto'>('hidden');

function syncCollapsedTextareaHeight() {
  const el = inputField.value;
  if (!el) return;
  if (isInputExpanded.value) return;

  // 关键：先重置为 auto，才能在删除内容时正确“缩回”
  el.style.height = 'auto';

  const scrollHeight = el.scrollHeight;
  const nextHeight = Math.max(
    COLLAPSED_MIN_HEIGHT,
    Math.min(scrollHeight, COLLAPSED_MAX_HEIGHT),
  );

  collapsedHeightPx.value = nextHeight;
  collapsedOverflowY.value =
    scrollHeight > COLLAPSED_MAX_HEIGHT ? 'auto' : 'hidden';

  // 直接写回 DOM，避免在“值未变化”时 Vue 不更新导致看起来失效
  el.style.height = `${nextHeight}px`;
  el.style.overflowY = collapsedOverflowY.value;
}

async function toggleInputExpanded() {
  isInputExpanded.value = !isInputExpanded.value;
  await nextTick();

  const el = inputField.value;
  if (!el) return;

  if (isInputExpanded.value) {
    // 展开态：释放收起态写入的固定高度
    el.style.height = 'auto';
    el.style.overflowY = 'auto';
  } else {
    syncCollapsedTextareaHeight();
  }
}

function handleInput() {
  // v-model 已经更新 prompt，这里只负责同步高度
  // 用 nextTick 确保文本渲染后再测量 scrollHeight
  nextTick(() => syncCollapsedTextareaHeight());
}

const textareaStyle = computed(() => {
  return {
    width: '100%',
    resize: 'none',
    outline: 'none',
    border: 'none',
    borderRadius: '0',
    padding: '0 32px',
    height: isInputExpanded.value ? 'auto' : `${collapsedHeightPx.value}px`,
    minHeight: isInputExpanded.value ? '560px' : `${COLLAPSED_MIN_HEIGHT}px`,
    maxHeight: isInputExpanded.value ? '50vh' : `${COLLAPSED_MAX_HEIGHT}px`,
    overflowY: isInputExpanded.value ? 'auto' : collapsedOverflowY.value,
    fontFamily: 'inherit',
    fontSize: '16px',
    backgroundColor: 'var(--v-theme-surface)',
  } as Record<string, string>;
});

watch(
  () => props.prompt,
  async () => {
    if (isInputExpanded.value) return;
    await nextTick();
    syncCollapsedTextareaHeight();
  },
);

watch(
  () => isInputExpanded.value,
  async (expanded) => {
    await nextTick();
    const el = inputField.value;
    if (!el) return;

    // 收起时：重新接管自动高度；展开时：释放固定高度
    if (!expanded) {
      syncCollapsedTextareaHeight();
    } else {
      el.style.height = 'auto';
      el.style.overflowY = 'auto';
    }
  },
);

// Ctrl+B 长按录音相关
const ctrlKeyDown = ref(false);
const ctrlKeyTimer = ref<number | null>(null);
const ctrlKeyLongPressThreshold = 300;

// 处理清除引用 - 触发关闭动画
function handleClearReply() {
  isReplyClosing.value = true;
}

// 动画完成后发送clearReply事件
function handleReplyAfterLeave() {
  emit('clearReply');
  isReplyClosing.value = false;
}

function handleKeyDown(e: KeyboardEvent) {
  // Enter 发送消息或触发命令
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();

    // 检查是否是 /astr_live_dev 命令
    if (localPrompt.value.trim() === '/astr_live_dev') {
      emit('openLiveMode');
      localPrompt.value = '';
      return;
    }

    if (canSend.value) {
      emit('send');
    }
  }

  if (e.ctrlKey && e.code === 'KeyB') {
    e.preventDefault();
    if (ctrlKeyDown.value) return;

    ctrlKeyDown.value = true;
    ctrlKeyTimer.value = window.setTimeout(() => {
      if (ctrlKeyDown.value && !props.isRecording) {
        emit('startRecording');
      }
    }, ctrlKeyLongPressThreshold);
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'KeyB') {
    ctrlKeyDown.value = false;

    if (ctrlKeyTimer.value) {
      clearTimeout(ctrlKeyTimer.value);
      ctrlKeyTimer.value = null;
    }

    if (props.isRecording) {
      emit('stopRecording');
    }
  }
}

function handlePaste(e: ClipboardEvent) {
  emit('pasteImage', e);
}

function handleDragOver(e: DragEvent) {
  // 清除之前的 leave timeout
  if (dragLeaveTimeout) {
    clearTimeout(dragLeaveTimeout);
    dragLeaveTimeout = null;
  }

  // 检查是否有文件
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true;
  }
}

function handleDragLeave(_e: DragEvent) {
  // 使用 timeout 避免在子元素间移动时闪烁
  dragLeaveTimeout = window.setTimeout(() => {
    isDragging.value = false;
  }, 50);
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    emit('fileSelect', files);
  }
}

function triggerImageInput() {
  imageInputRef.value?.click();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files) {
    emit('fileSelect', files);
  }
  target.value = '';
}

function handleRecordClick() {
  if (props.isRecording) {
    emit('stopRecording');
  } else {
    emit('startRecording');
  }
}

function handleConfigChange(payload: {
  configId: string;
  agentRunnerType: string;
}) {
  const runnerType = (payload.agentRunnerType || '').toLowerCase();
  const isInternal = runnerType === 'internal' || runnerType === 'local';
  showProviderSelector.value = isInternal;
}

function getCurrentSelection() {
  if (!showProviderSelector.value) {
    return null;
  }
  return providerModelMenuRef.value?.getCurrentSelection();
}

onMounted(() => {
  if (inputField.value) {
    inputField.value.addEventListener('paste', handlePaste);
  }
  document.addEventListener('keyup', handleKeyUp);
  nextTick(() => syncCollapsedTextareaHeight());
});

onBeforeUnmount(() => {
  if (inputField.value) {
    inputField.value.removeEventListener('paste', handlePaste);
  }
  document.removeEventListener('keyup', handleKeyUp);
});

defineExpose({
  getCurrentSelection,
});
</script>

<style scoped>
.input-area {
  padding: 16px;
  padding-top: 0;
  background-color: rgb(var(--v-theme-surface));
  border-top: none;
  position: relative;
  flex-shrink: 0;
  z-index: 20;
}

.input-container {
  border-radius: 24px;
  position: relative;
}

.textarea-wrapper {
  position: relative;
  border: 1px solid var(--v-theme-border);
  border-radius: 12px;
  overflow: hidden;
  -webkit-clip-path: inset(0 round 12px);
  clip-path: inset(0 round 12px);
  background-color: none !important;
  padding: 20px 0;
}

.expand-input-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  color: rgba(var(--v-theme-secondaryText), 0.9);
}

.expand-input-btn.v-btn--variant-text:hover {
  background-color: rgba(var(--v-theme-secondaryText), 0.1);
}

/* 预留右上角按钮空间，避免覆盖输入文字（仅在按钮出现时更明显） */
.chat-input-textarea {
  padding-right: 40px;
  box-sizing: border-box;
  display: block;
  margin: 0;
}

/* 拖拽上传遮罩 */
.drop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--v-theme-primary), 0.15);
  border: 2px dashed rgba(var(--v-theme-primary), 0.5);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.drop-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-text {
  font-size: 16px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}

/* Fade transition for drop overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.reply-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin: 8px 8px 0 8px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-radius: 12px;
  gap: 8px;
  max-height: 500px;
  overflow: hidden;
}

/* Transition animations for reply preview */
.slideReply-enter-active {
  animation: slideDown 0.2s ease-out;
}

.slideReply-leave-active {
  animation: slideUp 0.2s ease-out;
}

@keyframes slideDown {
  from {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    padding-top: 0;
    padding-bottom: 0;
  }

  to {
    max-height: 500px;
    opacity: 1;
    margin-top: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
}

@keyframes slideUp {
  from {
    max-height: 500px;
    opacity: 1;
    margin-top: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  to {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
}

.reply-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.reply-icon {
  color: rgb(var(--v-theme-secondary));
  flex-shrink: 0;
}

.reply-text {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.remove-reply-btn {
  flex-shrink: 0;
  opacity: 0.6;
}

.attachments-preview {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  max-width: 900px;
  margin: 8px auto 0;
  flex-wrap: wrap;
}

.image-preview,
.audio-preview,
.file-preview {
  position: relative;
  display: inline-flex;
}

.preview-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .preview-image {
    object-fit: contain;
  }
}

@media (hover: none) and (pointer: coarse) {
  .preview-image {
    object-fit: contain;
  }
}

.audio-chip,
.file-chip {
  height: 36px;
  border-radius: 18px;
}

.file-name-preview {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-attachment-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.remove-attachment-btn:hover {
  opacity: 1;
}

.input-action-btn {
  color: rgba(var(--v-theme-secondaryText), 0.9);
}

.input-action-btn.v-btn--variant-text:hover {
  background-color: rgba(var(--v-theme-secondaryText), 0.1);
}

.fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .input-area {
    padding: 0 !important;
  }

  .input-container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: none !important;
  }
}
</style>
