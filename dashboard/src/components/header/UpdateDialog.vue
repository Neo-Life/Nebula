<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import MarkdownContent from '@/components/shared/MarkdownContent.vue'
import { useI18n } from '@/i18n/composables'
import { useAuthStore } from '@/stores/auth'

type UpdateChannel = 'official' | 'landfill'

type UpdateTab = 'source' | 'dashboard'

type UpdateFlags = {
  hasNewVersion: boolean
  dashboardHasNewVersion: boolean
}

const props = defineProps<{
  modelValue: boolean
  botCurrVersion: string
  dashboardCurrentVersion: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updateFlags', value: UpdateFlags): void
}>()

const { t } = useI18n()

const updateTab = ref<UpdateTab>('source')

const sourceUpdateChannel = ref<UpdateChannel>(
  (localStorage.getItem('selectedSourceUpdateChannel') as UpdateChannel) || 'official'
)

const dashboardUpdateChannel = ref<UpdateChannel>(
  (localStorage.getItem('selectedDashboardUpdateChannel') as UpdateChannel) || 'official'
)

watch(sourceUpdateChannel, (val) => {
  localStorage.setItem('selectedSourceUpdateChannel', val)
})

watch(dashboardUpdateChannel, (val) => {
  localStorage.setItem('selectedDashboardUpdateChannel', val)
})

const updateChannelOptions = computed(() => [
  { title: t('core.header.updateDialog.channel.official'), value: 'official' },
  { title: t('core.header.updateDialog.channel.landfill'), value: 'landfill' }
])

const updateStatus = ref('')
const releaseMessage = ref('')
const hasNewVersion = ref(false)
const dashboardHasNewVersion = ref(false)

const releases = ref<any[]>([])
const installLoading = ref(false)
const updatingDashboardLoading = ref(false)

// Release Notes Modal
const releaseNotesDialog = ref(false)
const selectedReleaseNotes = ref('')
const selectedReleaseTag = ref('')

const releasesHeader = computed(() => [
  { title: t('core.header.updateDialog.table.tag'), key: 'tag_name' },
  { title: t('core.header.updateDialog.table.publishDate'), key: 'published_at' },
  { title: t('core.header.updateDialog.table.content'), key: 'body' },
  { title: t('core.header.updateDialog.table.sourceUrl'), key: 'zipball_url' },
  { title: t('core.header.updateDialog.table.actions'), key: 'switch' }
])

const isPreRelease = (version: string) => {
  const preReleaseKeywords = ['alpha', 'beta', 'rc', 'pre', 'preview', 'dev']
  const lowerVersion = version.toLowerCase()
  return preReleaseKeywords.some((keyword) => lowerVersion.includes(keyword))
}

function openReleaseNotesDialog(body: string, tag: string) {
  selectedReleaseNotes.value = body
  selectedReleaseTag.value = tag
  releaseNotesDialog.value = true
}

async function checkUpdate() {
  updateStatus.value = t('core.header.updateDialog.status.checking')
  try {
    const res = await axios.get('/api/update/check', {
      params: { channel: sourceUpdateChannel.value }
    })

    hasNewVersion.value = !!res.data.data.has_new_version
    dashboardHasNewVersion.value = !!res.data.data.dashboard_has_new_version

    emit('updateFlags', {
      hasNewVersion: hasNewVersion.value,
      dashboardHasNewVersion: dashboardHasNewVersion.value
    })

    if (hasNewVersion.value) {
      releaseMessage.value = res.data.message
      updateStatus.value = t('core.header.version.hasNewVersion')
    } else {
      updateStatus.value = res.data.message
    }
  } catch (err: any) {
    if (err?.response && err.response.status == 401) {
      const authStore = useAuthStore()
      authStore.logout()
      return
    }
    updateStatus.value = err
  }
}

async function getReleases() {
  try {
    const res = await axios.get('/api/update/releases', {
      params: { channel: sourceUpdateChannel.value }
    })
    releases.value = (res.data.data || []).map((item: any) => {
      item.published_at = new Date(item.published_at).toLocaleString()
      return item
    })
  } catch (err) {
    console.log(err)
  }
}

async function switchVersion(tag: string) {
  updateStatus.value = t('core.header.updateDialog.status.switching')
  installLoading.value = true
  try {
    const res = await axios.post('/api/update/do', {
      version: tag,
      proxy: localStorage.getItem('selectedGitHubProxy') || '',
      channel: sourceUpdateChannel.value
    })
    updateStatus.value = res.data.message
    if (res.data.status == 'ok') {
      setTimeout(() => window.location.reload(), 1000)
    }
  } catch (err) {
    console.log(err)
    updateStatus.value = err as any
  } finally {
    installLoading.value = false
  }
}

async function updateToLatestFromChannel() {
  updateStatus.value = t('core.header.updateDialog.status.switching')
  installLoading.value = true
  try {
    const res = await axios.post('/api/update/do', {
      version: 'latest',
      proxy: localStorage.getItem('selectedGitHubProxy') || '',
      channel: sourceUpdateChannel.value
    })
    updateStatus.value = res.data.message
    if (res.data.status == 'ok') {
      setTimeout(() => window.location.reload(), 1000)
    }
  } catch (err) {
    console.log(err)
    updateStatus.value = err as any
  } finally {
    installLoading.value = false
  }
}

async function updateDashboard() {
  updatingDashboardLoading.value = true
  updateStatus.value = t('core.header.updateDialog.status.updating')
  try {
    const res = await axios.post('/api/update/dashboard', {
      channel: dashboardUpdateChannel.value,
      proxy: localStorage.getItem('selectedGitHubProxy') || ''
    })
    updateStatus.value = res.data.message
    if (res.data.status == 'ok') {
      setTimeout(() => window.location.reload(), 1000)
    }
  } catch (err) {
    console.log(err)
    updateStatus.value = err as any
  } finally {
    updatingDashboardLoading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      updateTab.value = 'source'
      checkUpdate()
      getReleases()
    }
  }
)

onMounted(() => {
  checkUpdate()
})

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})
</script>

<template>
  <v-dialog v-model="dialogModel" :width="$vuetify.display.smAndDown ? '100%' : '1200'" :fullscreen="$vuetify.display.xs">
    <v-card class="update-dialog-card">
      <v-card-title class="mobile-card-title">
        <span class="text-h5">{{ t('core.header.updateDialog.title') }}</span>
        <v-btn v-if="$vuetify.display.xs" icon @click="dialogModel = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="update-dialog-content">
        <v-container>
          <v-progress-linear v-show="installLoading" class="mb-4" indeterminate color="primary"></v-progress-linear>

          <div>
            <h1 style="display: inline-block">{{ botCurrVersion }}</h1>
            <small style="margin-left: 4px">{{ updateStatus }}</small>
          </div>

          <div class="mt-4">
            <v-tabs v-model="updateTab" color="primary">
              <v-tab value="source">{{ t('core.header.updateDialog.tabs.source') }}</v-tab>
              <v-tab value="dashboard">{{ t('core.header.updateDialog.tabs.dashboard') }}</v-tab>
            </v-tabs>
          </div>

          <v-window v-model="updateTab" class="mt-4">
            <v-window-item value="source">
              <div class="mt-2">
                <v-select
                  v-model="sourceUpdateChannel"
                  :items="updateChannelOptions"
                  item-title="title"
                  item-value="value"
                  density="comfortable"
                  variant="outlined"
                  style="max-width: 520px"
                  :label="t('core.header.updateDialog.channel.label')"
                  @update:model-value="() => { checkUpdate(); getReleases(); }"
                />
              </div>

              <div
                v-if="releaseMessage"
                style="background-color: #646cff24; padding: 16px; border-radius: 10px; font-size: 14px; max-height: 400px; overflow-y: auto"
              >
                <MarkdownContent :content="releaseMessage" :typewriter="false" />
              </div>

              <div class="mb-4 mt-4">
                <small>{{ t('core.header.updateDialog.tip') }} {{ t('core.header.updateDialog.tipContinue') }}</small>
              </div>

              <div v-if="sourceUpdateChannel === 'official'">
                <div class="mb-4">
                  <small>
                    {{ t('core.header.updateDialog.dockerTip') }}
                    <a href="https://containrrr.dev/watchtower/usage-overview/">{{ t('core.header.updateDialog.dockerTipLink') }}</a>
                    {{ t('core.header.updateDialog.dockerTipContinue') }}
                  </small>
                </div>

                <v-alert v-if="releases.some((item: any) => isPreRelease(item['tag_name']))" type="warning" variant="tonal" border="start">
                  <template v-slot:prepend>
                    <v-icon>mdi-alert-circle-outline</v-icon>
                  </template>
                  <div class="text-body-2">
                    <strong>{{ t('core.header.updateDialog.preReleaseWarning.title') }}</strong>
                    <br />
                    {{ t('core.header.updateDialog.preReleaseWarning.description') }}
                    <a href="https://github.com/AstrBotDevs/AstrBot/issues" target="_blank" class="text-decoration-none">
                      {{ t('core.header.updateDialog.preReleaseWarning.issueLink') }}
                    </a>
                  </div>
                </v-alert>

                <v-data-table :headers="releasesHeader" :items="releases" item-key="name" :items-per-page="8">
                  <template v-slot:item.tag_name="{ item }: { item: any }">
                    <div class="d-flex align-center">
                      <span>{{ item.tag_name }}</span>
                      <v-chip v-if="isPreRelease(item.tag_name)" size="x-small" color="warning" variant="tonal" class="ml-2">
                        {{ t('core.header.updateDialog.preRelease') }}
                      </v-chip>
                    </div>
                  </template>
                  <template v-slot:item.body="{ item }: { item: { body: string; tag_name: string } }">
                    <v-btn @click="openReleaseNotesDialog(item.body, item.tag_name)" rounded="xl" variant="tonal" color="primary" size="x-small">
                      {{ t('core.header.updateDialog.table.view') }}
                    </v-btn>
                  </template>
                  <template v-slot:item.switch="{ item }: { item: { tag_name: string } }">
                    <v-btn @click="switchVersion(item.tag_name)" rounded="xl" variant="plain" color="primary">
                      {{ t('core.header.updateDialog.table.switch') }}
                    </v-btn>
                  </template>
                </v-data-table>
              </div>

              <div v-else class="mt-2">
                <v-alert type="info" variant="tonal" border="start" class="mb-4">
                  {{ t('core.header.updateDialog.channel.landfillTip') }}
                </v-alert>
                <v-btn color="primary" style="border-radius: 10px" @click="updateToLatestFromChannel" :loading="installLoading">
                  {{ t('core.header.updateDialog.channel.updateLatest') }}
                </v-btn>
              </div>
            </v-window-item>

            <v-window-item value="dashboard">
              <div class="mt-2">
                <v-select
                  v-model="dashboardUpdateChannel"
                  :items="updateChannelOptions"
                  item-title="title"
                  item-value="value"
                  density="comfortable"
                  variant="outlined"
                  style="max-width: 520px"
                  :label="t('core.header.updateDialog.channel.label')"
                />
              </div>

              <div style="margin-top: 16px">
                <h3 class="mb-4">{{ t('core.header.updateDialog.dashboardUpdate.title') }}</h3>
                <div class="mb-4">
                  <small>{{ t('core.header.updateDialog.dashboardUpdate.currentVersion') }} {{ dashboardCurrentVersion }}</small>
                  <br />
                </div>

                <div class="mb-4">
                  <p v-if="dashboardHasNewVersion">
                    {{ t('core.header.updateDialog.dashboardUpdate.hasNewVersion') }}
                  </p>
                  <p v-else="dashboardHasNewVersion">
                    {{ t('core.header.updateDialog.dashboardUpdate.isLatest') }}
                  </p>
                </div>

                <v-btn
                  color="primary"
                  style="border-radius: 10px"
                  @click="updateDashboard()"
                  :disabled="dashboardUpdateChannel === 'official' ? !dashboardHasNewVersion : false"
                  :loading="updatingDashboardLoading"
                >
                  {{ t('core.header.updateDialog.dashboardUpdate.downloadAndUpdate') }}
                </v-btn>
              </div>
            </v-window-item>
          </v-window>
        </v-container>
      </v-card-text>
      <v-card-actions class="update-dialog-actions">
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="dialogModel = false">
          {{ t('core.common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="releaseNotesDialog" max-width="800">
    <v-card>
      <v-card-title class="text-h5">{{ t('core.header.updateDialog.releaseNotes.title') }}: {{ selectedReleaseTag }}</v-card-title>
      <v-card-text style="font-size: 14px; max-height: 400px; overflow-y: auto">
        <MarkdownContent :content="selectedReleaseNotes" :typewriter="false" />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="releaseNotesDialog = false">
          {{ t('core.common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style>
.update-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 780px);
}

.update-dialog-card .mobile-card-title {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.update-dialog-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
}

.update-dialog-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: var(--v-theme-surface);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.mobile-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<style scoped>
.update-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 780px);
}

.update-dialog-card .mobile-card-title {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.update-dialog-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
}

.update-dialog-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: var(--v-theme-surface);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
