<template>
  <v-card class="chat-page-card" elevation="0" rounded="0">
    <v-card-text class="chat-page-container">
      <!-- 遮罩层 (手机端) -->
      <div
        v-if="isMobile && mobileMenuOpen"
        class="mobile-overlay"
        @click="closeMobileSidebar"
      />

      <div class="chat-layout">
        <ConversationSidebar
          :sessions="sessions"
          :selected-sessions="selectedSessions"
          :curr-session-id="currSessionId"
          :selected-project-id="selectedProjectId"
          :is-dark="isDark"
          :chatbox-mode="chatboxMode"
          :is-mobile="isMobile"
          :mobile-menu-open="mobileMenuOpen"
          :projects="projects"
          @new-chat="handleNewChat"
          @select-conversation="handleSelectConversation"
          @edit-title="showEditTitleDialog"
          @delete-conversation="handleDeleteConversation"
          @close-mobile-sidebar="closeMobileSidebar"
          @toggle-theme="toggleTheme"
          @toggle-fullscreen="toggleFullscreen"
          @select-project="handleSelectProject"
          @create-project="showCreateProjectDialog"
          @edit-project="showEditProjectDialog"
          @delete-project="handleDeleteProject"
        />

        <!-- 右侧聊天内容区域 -->
        <div class="chat-content-panel">
          <!-- Live Mode -->
          <LiveMode v-if="liveModeOpen" @close="closeLiveMode" />

          <!-- 正常聊天界面 -->
          <template v-else>
            <div v-if="isMobile" class="conversation-header fade-in">
              <!-- 手机端菜单按钮 -->
              <v-btn
                icon
                class="mobile-menu-btn"
                variant="text"
                @click="toggleMobileSidebar"
              >
                <v-icon>mdi-menu</v-icon>
              </v-btn>
            </div>
            <div
              v-if="!selectedProjectId && messages && messages.length > 0"
              class="message-list-wrapper"
            >
              <MessageList
                ref="messageList"
                :messages="messages"
                :is-dark="isDark"
                :is-streaming="isStreaming || isConvRunning"
                :is-loading-messages="isLoadingMessages"
                @open-image-preview="openImagePreview"
                @reply-message="handleReplyMessage"
                @reply-with-text="handleReplyWithText"
                @open-refs="handleOpenRefs"
              />
              <div class="message-list-fade" :class="{ 'fade-dark': isDark }" />
            </div>
            <ProjectView
              v-else-if="selectedProjectId"
              :project="currentProject"
              :sessions="projectSessions"
              @select-session="
                (sessionId) => handleSelectConversation([sessionId])
              "
              @edit-session-title="showEditTitleDialog"
              @delete-session="handleDeleteConversation"
            />
            <WelcomeView
              v-else
              :is-loading="isLoadingMessages"
              bot-name="Nebula"
            />

            <!-- 输入区域 -->
            <ChatInput
              v-model:prompt="prompt"
              :staged-images-url="stagedImagesUrl"
              :staged-audio-url="stagedAudioUrl"
              :staged-files="stagedNonImageFiles"
              :disabled="isStreaming || isConvRunning || isLoadingMessages"
              :enable-streaming="enableStreaming"
              :is-recording="isRecording"
              :session-id="currSessionId || null"
              :current-session="getCurrentSession"
              :reply-to="replyTo"
              @send="handleSendMessage"
              @toggle-streaming="toggleStreaming"
              ref="chatInputRef"
              @remove-image="removeImage"
              @remove-audio="removeAudio"
              @remove-file="removeFile"
              @start-recording="handleStartRecording"
              @stop-recording="handleStopRecording"
              @paste-image="handlePaste"
              @file-select="handleFileSelect"
              @clear-reply="clearReply"
              @open-live-mode="openLiveMode"
            />
          </template>
        </div>

        <!-- Refs Sidebar -->
        <RefsSidebar v-model="refsSidebarOpen" :refs="refsSidebarRefs" />
      </div>
    </v-card-text>
  </v-card>

  <!-- 编辑对话标题对话框 -->
  <v-dialog v-model="editTitleDialog" max-width="400">
    <v-card>
      <v-card-title class="dialog-title">
        {{ tm('actions.editTitle') }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="editingTitle"
          :label="tm('conversation.newConversation')"
          variant="outlined"
          hide-details
          class="mt-2"
          autofocus
          @keyup.enter="handleSaveTitle"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="editTitleDialog = false"
        >
          {{ t('core.common.cancel') }}
        </v-btn>
        <v-btn variant="text" color="primary" @click="handleSaveTitle">
          {{ t('core.common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 图片预览对话框 -->
  <v-dialog
    v-model="imagePreviewDialog"
    max-width="90vw"
    max-height="90vh"
    scrollable
  >
    <v-card class="image-preview-card" elevation="8">
      <v-card-title
        class="image-preview-header d-flex justify-space-between align-center pa-4"
      >
        <span>{{ t('core.common.imagePreview') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="imagePreviewDialog = false"
        />
      </v-card-title>
      <v-card-text class="image-preview-body text-center pa-4">
        <img :src="previewImageUrl" class="preview-image-large" />
      </v-card-text>
      <v-card-actions class="image-preview-footer pa-2">
        <v-spacer />
        <v-btn variant="text" @click="imagePreviewDialog = false">
          {{ t('core.common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 创建/编辑项目对话框 -->
  <ProjectDialog
    v-model="projectDialog"
    :project="editingProject"
    @save="handleSaveProject"
  />
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCustomizerStore } from '@/stores/customizer';
import { useI18n, useModuleI18n } from '@/i18n/composables';
import { useToast } from '@/utils/toast';
import { useTheme } from 'vuetify';
import MessageList from '@/components/chat/MessageList.vue';
import ConversationSidebar from '@/components/chat/ConversationSidebar.vue';
import ChatInput from '@/components/chat/ChatInput.vue';
import ProjectDialog from '@/components/chat/ProjectDialog.vue';
import ProjectView from '@/components/chat/ProjectView.vue';
import WelcomeView from '@/components/chat/WelcomeView.vue';
import RefsSidebar from '@/components/chat/message_list_comps/RefsSidebar.vue';
import LiveMode from '@/components/chat/LiveMode.vue';
import type { ProjectFormData } from '@/components/chat/ProjectDialog.vue';
import type { Project } from '@/components/chat/ProjectList.vue';
import { useSessions } from '@/composables/useSessions';
import { useMessages } from '@/composables/useMessages';
import { useMediaHandling } from '@/composables/useMediaHandling';
import { useProjects } from '@/composables/useProjects';
import { useRecording } from '@/composables/useRecording';

interface Props {
  chatboxMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  chatboxMode: false,
});

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { tm } = useModuleI18n('features/chat');
const theme = useTheme();

// UI 状态
const isMobile = ref(false);
const mobileMenuOpen = ref(false);
const imagePreviewDialog = ref(false);
const previewImageUrl = ref('');
const isLoadingMessages = ref(false);
const liveModeOpen = ref(false);

let resyncTimer: number | null = null;

function scheduleResyncCurrentSession() {
  if (resyncTimer !== null) {
    window.clearTimeout(resyncTimer);
    resyncTimer = null;
  }

  // 轻微 debounce，避免 focus/visibility 事件连发
  resyncTimer = window.setTimeout(async () => {
    resyncTimer = null;

    if (!currSessionId.value) return;
    if (isLoadingMessages.value) return;
    if (isStreaming.value || isConvRunning.value) return;

    try {
      await getSessionMsg(currSessionId.value);
    } catch {
      // ignore
    }
  }, 200);
}

function handleWindowFocus() {
  scheduleResyncCurrentSession();
}

function handleVisibilityChange() {
  if (!document.hidden) {
    scheduleResyncCurrentSession();
  }
}

// 使用 composables
const {
  sessions,
  selectedSessions,
  currSessionId,
  editTitleDialog,
  editingTitle,
  getCurrentSession,
  getSessions,
  newSession,
  deleteSession: deleteSessionFn,
  showEditTitleDialog,
  saveTitle,
  updateSessionTitle,
  newChat,
} = useSessions(props.chatboxMode);

const {
  stagedImagesUrl,
  stagedAudioUrl,
  stagedFiles,
  stagedNonImageFiles,
  getMediaFile,
  processAndUploadImage,
  processAndUploadFile,
  handlePaste,
  removeImage,
  removeAudio,
  removeFile,
  clearStaged,
  cleanupMediaCache,
} = useMediaHandling();

const {
  isRecording: isRecording,
  startRecording: startRec,
  stopRecording: stopRec,
} = useRecording();

const {
  projects,
  selectedProjectId,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addSessionToProject,
  getProjectSessions,
} = useProjects();

const {
  messages,
  isStreaming,
  isConvRunning,
  enableStreaming,
  getSessionMessages: getSessionMsg,
  sendMessage: sendMsg,
  toggleStreaming,
} = useMessages(currSessionId, getMediaFile, updateSessionTitle, getSessions);

// 组件引用
const messageList = ref<InstanceType<typeof MessageList> | null>(null);
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null);

// 输入状态
const prompt = ref('');

// 项目状态
const projectDialog = ref(false);
const editingProject = ref<Project | null>(null);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ProjectSession {
  session_id: string;
  display_name?: string;
  updated_at: string;
}

function normalizeProjectSessions(value: unknown): ProjectSession[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ProjectSession | null => {
      if (!isRecord(item)) return null;
      const sessionId = item.session_id;
      const updatedAt = item.updated_at;
      if (typeof sessionId !== 'string' || typeof updatedAt !== 'string') {
        return null;
      }

      const displayName = item.display_name;
      const normalized: ProjectSession = {
        session_id: sessionId,
        updated_at: updatedAt,
      };
      if (typeof displayName === 'string') {
        normalized.display_name = displayName;
      }
      return normalized;
    })
    .filter((s): s is ProjectSession => s !== null);
}

const projectSessions = ref<ProjectSession[]>([]);
const currentProject = computed(() =>
  projects.value.find((p) => p.project_id === selectedProjectId.value),
);

// 引用消息状态
interface ReplyInfo {
  messageId: number; // PlatformSessionHistoryMessage 的 id
  selectedText?: string; // 选中的文本内容（可选）
}
const replyTo = ref<ReplyInfo | null>(null);

const isDark = computed(
  () => useCustomizerStore().uiTheme === 'PurpleThemeDark',
);

// 检测是否为手机端
function checkMobile() {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    mobileMenuOpen.value = false;
  }
}

function toggleMobileSidebar() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileSidebar() {
  mobileMenuOpen.value = false;
}

function toggleTheme() {
  const customizer = useCustomizerStore();
  const newTheme =
    customizer.uiTheme === 'PurpleTheme' ? 'PurpleThemeDark' : 'PurpleTheme';
  customizer.SET_UI_THEME(newTheme);
  theme.global.name.value = newTheme;
}

function toggleFullscreen() {
  if (props.chatboxMode) {
    router.push(currSessionId.value ? `/chat/${currSessionId.value}` : '/chat');
  } else {
    router.push(
      currSessionId.value ? `/chatbox/${currSessionId.value}` : '/chatbox',
    );
  }
}

function openImagePreview(imageUrl: string) {
  previewImageUrl.value = imageUrl;
  imagePreviewDialog.value = true;
}

async function handleSaveTitle() {
  await saveTitle();

  // 如果在项目视图中，刷新项目会话列表
  if (selectedProjectId.value) {
    const sessions: unknown = await getProjectSessions(selectedProjectId.value);
    projectSessions.value = normalizeProjectSessions(sessions);
  }
}

type PlainMessagePart = { type: 'plain'; text: string };

function isPlainMessagePart(value: unknown): value is PlainMessagePart {
  return (
    isRecord(value) &&
    value.type === 'plain' &&
    typeof value.text === 'string' &&
    value.text.trim() !== ''
  );
}

function toMessageId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function handleReplyMessage(msg: unknown, _index: number) {
  // 从消息中获取 id (PlatformSessionHistoryMessage 的 id)
  const messageId = isRecord(msg) && 'id' in msg ? toMessageId(msg.id) : null;
  if (!messageId) {
    console.warn('Message does not have an id');
    return;
  }

  // 获取消息内容用于显示
  let messageContent = '';
  const content = isRecord(msg) ? msg.content : undefined;
  const message = isRecord(content) ? content.message : undefined;

  if (typeof message === 'string') {
    messageContent = message;
  } else if (Array.isArray(message)) {
    // 从消息段数组中提取纯文本
    const textParts = message
      .filter(isPlainMessagePart)
      .map((part) => part.text);
    messageContent = textParts.join('');
  }

  // 截断过长的内容
  if (messageContent.length > 100) {
    messageContent = messageContent.substring(0, 100) + '...';
  }

  replyTo.value = {
    messageId,
    selectedText: messageContent || '[媒体内容]',
  };
}

function clearReply() {
  replyTo.value = null;
}

function handleReplyWithText(replyData: unknown) {
  // 处理选中文本的引用
  const messageId =
    isRecord(replyData) && 'messageId' in replyData
      ? toMessageId(replyData.messageId)
      : null;
  const selectedText =
    isRecord(replyData) && typeof replyData.selectedText === 'string'
      ? replyData.selectedText
      : '';

  if (!messageId) {
    console.warn('Message does not have an id');
    return;
  }

  replyTo.value = {
    messageId,
    selectedText: selectedText, // 保存原始的选中文本
  };
}

// Refs Sidebar 状态
const refsSidebarOpen = ref(false);
type RefItem = {
  title?: string;
  url?: string;
  favicon?: string;
  snippet?: string;
};

type RefsPayload = {
  used?: RefItem[];
} | null;

function normalizeRefsPayload(value: unknown): RefsPayload {
  if (value === null) return null;
  if (!isRecord(value)) return null;

  const used = value.used;
  if (!Array.isArray(used)) return { used: [] };

  const normalizedUsed = used
    .map((item): RefItem | null => {
      if (!isRecord(item)) return null;

      const normalized: RefItem = {};
      if (typeof item.title === 'string') normalized.title = item.title;
      if (typeof item.url === 'string') normalized.url = item.url;
      if (typeof item.favicon === 'string') normalized.favicon = item.favicon;
      if (typeof item.snippet === 'string') normalized.snippet = item.snippet;
      return normalized;
    })
    .filter((r): r is RefItem => r !== null);

  return { used: normalizedUsed };
}

const refsSidebarRefsRaw = ref<unknown>(null);
const refsSidebarRefs = computed<RefsPayload>(() =>
  normalizeRefsPayload(refsSidebarRefsRaw.value),
);

function handleOpenRefs(refs: unknown) {
  // 如果sidebar已打开且点击的是同一个refs，则关闭
  if (refsSidebarOpen.value && refsSidebarRefsRaw.value === refs) {
    refsSidebarOpen.value = false;
  } else {
    // 否则打开sidebar并更新refs
    refsSidebarRefsRaw.value = refs;
    refsSidebarOpen.value = true;
  }
}

async function handleSelectConversation(sessionIds: string[]) {
  if (!sessionIds[0]) return;

  // 退出项目视图
  selectedProjectId.value = null;
  projectSessions.value = [];

  // 立即更新选中状态，避免需要点击两次
  currSessionId.value = sessionIds[0];
  selectedSessions.value = [sessionIds[0]];

  // 更新 URL
  const basePath = props.chatboxMode ? '/chatbox' : '/chat';
  if (route.path !== `${basePath}/${sessionIds[0]}`) {
    router.push(`${basePath}/${sessionIds[0]}`);
  }

  // 手机端关闭侧边栏
  if (isMobile.value) {
    closeMobileSidebar();
  }

  // 清除引用状态
  clearReply();

  // 开始加载消息
  isLoadingMessages.value = true;

  try {
    await getSessionMsg(sessionIds[0]);
  } finally {
    isLoadingMessages.value = false;
  }

  nextTick(() => {
    messageList.value?.scrollToBottom();
  });
}

function handleNewChat() {
  newChat(closeMobileSidebar);
  messages.value = [];
  clearReply();
  // 退出项目视图
  selectedProjectId.value = null;
  projectSessions.value = [];
}

async function handleDeleteConversation(sessionId: string) {
  await deleteSessionFn(sessionId);
  messages.value = [];

  // 如果在项目视图中，刷新项目会话列表
  if (selectedProjectId.value) {
    const sessions = await getProjectSessions(selectedProjectId.value);
    projectSessions.value = sessions;
  }
}

async function handleSelectProject(projectId: string) {
  selectedProjectId.value = projectId;
  const sessions = await getProjectSessions(projectId);
  projectSessions.value = sessions;
  messages.value = [];

  // 清空当前会话ID，准备在项目中创建新对话
  currSessionId.value = '';
  selectedSessions.value = [];

  // 手机端关闭侧边栏
  if (isMobile.value) {
    closeMobileSidebar();
  }
}

function showCreateProjectDialog() {
  editingProject.value = null;
  projectDialog.value = true;
}

function showEditProjectDialog(project: Project) {
  editingProject.value = project;
  projectDialog.value = true;
}

async function handleSaveProject(
  formData: ProjectFormData,
  projectId?: string,
) {
  if (projectId) {
    await updateProject(
      projectId,
      formData.title,
      formData.emoji,
      formData.description,
    );
  } else {
    await createProject(formData.title, formData.emoji, formData.description);
  }
}

async function handleDeleteProject(projectId: string) {
  await deleteProject(projectId);
}

async function handleStartRecording() {
  await startRec();
}

async function handleStopRecording() {
  const audioFilename = await stopRec();
  stagedAudioUrl.value = audioFilename;
}

async function handleFileSelect(files: FileList) {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  // 将 FileList 转换为数组，避免异步处理时 FileList 被清空
  const fileArray = Array.from(files);
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    if (imageTypes.includes(file.type)) {
      await processAndUploadImage(file);
    } else {
      await processAndUploadFile(file);
    }
  }
}

function openLiveMode() {
  liveModeOpen.value = true;
}

function closeLiveMode() {
  liveModeOpen.value = false;
}

async function handleSendMessage() {
  if (isLoadingMessages.value) {
    return;
  }
  if (isStreaming.value || isConvRunning.value) {
    useToast().info(tm('errors.sessionRunning'), { timeout: 3000 });
    return;
  }

  // 只有引用不能发送，必须有输入内容
  if (
    !prompt.value.trim() &&
    stagedFiles.value.length === 0 &&
    !stagedAudioUrl.value
  ) {
    return;
  }

  const isCreatingNewSession = !currSessionId.value;
  const currentProjectId = selectedProjectId.value;

  if (isCreatingNewSession) {
    await newSession();

    // 如果在项目视图中创建新会话，立即退出项目视图
    if (currentProjectId) {
      selectedProjectId.value = null;
      projectSessions.value = [];
    }
  }

  const promptToSend = prompt.value.trim();
  const audioNameToSend = stagedAudioUrl.value;
  const filesToSend = stagedFiles.value.map((f) => ({
    attachment_id: f.attachment_id,
    url: f.url,
    original_name: f.original_name,
    type: f.type,
  }));
  const replyToSend = replyTo.value ? { ...replyTo.value } : null;

  // 清空输入和附件和引用
  prompt.value = '';
  clearStaged();
  clearReply();

  // 获取选择的提供商和模型
  const selection = chatInputRef.value?.getCurrentSelection();
  const selectedProviderId = selection?.providerId || '';
  const selectedModelName = selection?.modelName || '';

  await sendMsg(
    promptToSend,
    filesToSend,
    audioNameToSend,
    selectedProviderId,
    selectedModelName,
    replyToSend,
  );

  // 如果在项目中创建了新会话，将其添加到项目
  if (isCreatingNewSession && currentProjectId && currSessionId.value) {
    await addSessionToProject(currSessionId.value, currentProjectId);
    // 刷新会话列表，移除已添加到项目的会话
    await getSessions();
    // 重新获取会话消息以更新项目信息（用于面包屑显示）
    await getSessionMsg(currSessionId.value);
  }
}

// 路由变化监听
watch(
  () => route.path,
  (to, from) => {
    if (
      from &&
      ((from.startsWith('/chat') && to.startsWith('/chatbox')) ||
        (from.startsWith('/chatbox') && to.startsWith('/chat')))
    ) {
      return;
    }

    const basePath = props.chatboxMode ? '/chatbox' : '/chat';
    if (to.startsWith(`${basePath}/`)) {
      const pathSessionId = to.split('/')[2];
      if (pathSessionId && pathSessionId !== currSessionId.value) {
        if (sessions.value.length > 0) {
          const exists = sessions.value.some(
            (s) => s.session_id === pathSessionId,
          );
          if (!exists) {
            useToast().error(tm('errors.sessionNotFound'), { timeout: 3000 });

            const firstSession = sessions.value[0];
            if (firstSession?.session_id) {
              void router.replace(`${basePath}/${firstSession.session_id}`);
              handleSelectConversation([firstSession.session_id]);
            } else {
              void router.replace(basePath);
            }
            return;
          }
        }
        handleSelectConversation([pathSessionId]);
      }
    }
  },
  { immediate: true },
);

// 会话列表加载后：仅在“没有指定会话ID”时默认进入第一个会话
watch(sessions, (newSessions) => {
  const basePath = props.chatboxMode ? '/chatbox' : '/chat';
  const pathSessionId = route.path.startsWith(`${basePath}/`)
    ? route.path.split('/')[2] || ''
    : '';
  const hasPathSessionId = !!pathSessionId;

  // URL 指定了 sessionId，但列表里不存在：提示并回退到可用会话
  if (hasPathSessionId && newSessions.length > 0) {
    const exists = newSessions.some((s) => s.session_id === pathSessionId);
    if (!exists) {
      useToast().error(tm('errors.sessionNotFound'), { timeout: 3000 });
      messages.value = [];
      currSessionId.value = '';
      selectedSessions.value = [];

      const firstSession = newSessions[0];
      selectedSessions.value = [firstSession.session_id];
      void router.replace(`${basePath}/${firstSession.session_id}`);
      handleSelectConversation([firstSession.session_id]);
      return;
    }
  }

  if (!currSessionId.value && !hasPathSessionId && newSessions.length > 0) {
    const firstSession = newSessions[0];
    selectedSessions.value = [firstSession.session_id];
    handleSelectConversation([firstSession.session_id]);
  }
});

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  getSessions();
  getProjects();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('focus', handleWindowFocus);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (resyncTimer !== null) {
    window.clearTimeout(resyncTimer);
    resyncTimer = null;
  }
  cleanupMediaCache();
});
</script>

<style scoped>
/* 基础动画 */
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

.chat-page-card {
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.chat-page-container {
  width: 100%;
  height: 100%;
  max-height: 100%;
  padding: 0;
  overflow: hidden;
}

.chat-layout {
  height: 100%;
  max-height: 100%;
  display: flex;
  overflow: hidden;
}

/* 手机端遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.2s ease;
}

.chat-content-panel {
  height: 100%;
  max-height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-list-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--v-theme-surface));
}

.message-list-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(
    to top,
    rgb(var(--v-theme-surface)) 0%,
    rgba(var(--v-theme-surface), 0) 100%
  );

  pointer-events: none;
  z-index: 10;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  padding-left: 16px;
  border-bottom: 1px solid var(--v-theme-border);
  width: 100%;
  padding-right: 32px;
  flex-shrink: 0;
}

.mobile-menu-btn {
  margin-right: 8px;
}

.conversation-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.fullscreen-icon {
  cursor: pointer;
  margin-left: 8px;
}

.breadcrumb-container {
  padding: 8px 16px;
  border-bottom: 1px solid var(--v-theme-border);
  flex-shrink: 0;
}

.breadcrumb-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-emoji {
  font-size: 16px;
}

.breadcrumb-project {
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.breadcrumb-project:hover {
  opacity: 0.7;
}

.breadcrumb-session {
  color: var(--v-theme-secondaryText);
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.dialog-title {
  font-size: 18px;
  font-weight: 500;
  padding-bottom: 8px;
}

/* 手机端样式调整 */
@media (max-width: 768px) {
  .chat-content-panel {
    width: 100%;
  }

  .chat-page-container {
    padding: 0 !important;
  }

  .conversation-header {
    padding: 2px;
  }
}

.image-preview-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.image-preview-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--v-theme-border);
  background: rgb(var(--v-theme-surface));
}

.image-preview-body {
  flex: 1;
  overflow: auto;
}

.image-preview-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--v-theme-border);
  background: rgb(var(--v-theme-surface));
}

.preview-image-large {
  max-width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
</style>
