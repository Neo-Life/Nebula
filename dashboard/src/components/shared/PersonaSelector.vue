<template>
  <BaseFolderItemSelector
    :model-value="modelValue"
    @update:model-value="handleUpdate"
    :folder-tree="folderTree"
    :items="currentPersonas as any"
    :tree-loading="treeLoading"
    :items-loading="itemsLoading"
    :labels="labels"
    :show-create-button="true"
    :default-item="defaultPersona"
    item-id-field="persona_id"
    item-name-field="persona_id"
    item-description-field="system_prompt"
    :display-value-formatter="formatDisplayValue"
    @navigate="handleNavigate"
    @create="openCreatePersona"
  />

  <!-- 创建人格对话框 -->
  <PersonaForm
    v-model="showCreateDialog"
    :editing-persona="null"
    :current-folder-id="currentFolderId ?? undefined"
    :current-folder-name="currentFolderName ?? undefined"
    @saved="handlePersonaCreated"
    @error="handleError" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type PropType } from 'vue'
import axios from 'axios'
import BaseFolderItemSelector from '@/components/folder/BaseFolderItemSelector.vue'
import PersonaForm from './PersonaForm.vue'
import { useI18n, useModuleI18n } from '@/i18n/composables'
import type { FolderTreeNode, SelectableItem } from '@/components/folder/types'

interface Persona {
  persona_id: string
  system_prompt: string
  folder_id?: string | null
  [key: string]: any
}

const props = defineProps({
  modelValue: {
    type: String as PropType<string>,
    default: ''
  },
  buttonText: {
    type: String as PropType<string>,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const { tm } = useModuleI18n('core.shared')

const folderTree = ref<FolderTreeNode[]>([])
const currentPersonas = ref<Persona[]>([])
const treeLoading = ref(false)
const itemsLoading = ref(false)
const showCreateDialog = ref(false)
const currentFolderId = ref<string | null>(null)

// 默认人格
const defaultPersona: SelectableItem = {
  id: 'default',
  persona_id: 'default',
  name: tm('personaSelector.defaultPersona'),
  system_prompt: 'You are a helpful and friendly assistant.'
}

// 递归查找文件夹名称
function findFolderName(nodes: FolderTreeNode[], folderId: string): string | null {
  for (const node of nodes) {
    if (node.folder_id === folderId) {
      return node.name
    }
    if (node.children && node.children.length > 0) {
      const found = findFolderName(node.children, folderId)
      if (found) return found
    }
  }
  return null
}

// 当前文件夹名称
const currentFolderName = computed(() => {
  if (!currentFolderId.value) {
    return null
  }
  return findFolderName(folderTree.value, currentFolderId.value)
})

// 标签配置
const labels = computed(() => ({
  dialogTitle: tm('personaSelector.dialogTitle'),
  notSelected: tm('personaSelector.notSelected'),
  buttonText: props.buttonText || tm('personaSelector.buttonText'),
  noItems: tm('personaSelector.noPersonas'),
  defaultItem: tm('personaSelector.defaultPersona'),
  noDescription: tm('personaSelector.noDescription'),
  createButton: tm('personaSelector.createPersona'),
  confirmButton: t('core.common.confirm'),
  cancelButton: t('core.common.cancel'),
  rootFolder: tm('personaSelector.rootFolder') || '全部人格',
  emptyFolder: tm('personaSelector.emptyFolder') || '此文件夹为空'
}))

function formatDisplayValue(value: string): string {
  if (value === 'default') {
    return tm('personaSelector.defaultPersona')
  }
  return value
}

function handleUpdate(value: string) {
  emit('update:modelValue', value)
}

async function loadFolderTree() {
  treeLoading.value = true
  try {
    const response = await axios.get('/api/persona/folder/tree')
    if (response.data.status === 'ok') {
      folderTree.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载文件夹树失败:', error)
    folderTree.value = []
  } finally {
    treeLoading.value = false
  }
}

async function loadPersonasInFolder(folderId: string | null) {
  itemsLoading.value = true
  try {
    const params = new URLSearchParams()
    if (folderId !== null) {
      params.set('folder_id', folderId)
    } else {
      params.set('folder_id', '')
    }
    const response = await axios.get(`/api/persona/list?${params.toString()}`)
    if (response.data.status === 'ok') {
      currentPersonas.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载人格列表失败:', error)
    currentPersonas.value = []
  } finally {
    itemsLoading.value = false
  }
}

async function handleNavigate(folderId: string | null) {
  currentFolderId.value = folderId
  await loadPersonasInFolder(folderId)
}

function openCreatePersona() {
  showCreateDialog.value = true
}

async function handlePersonaCreated(message: unknown) {
  console.log('人格创建成功:', message)
  showCreateDialog.value = false
  await loadPersonasInFolder(currentFolderId.value)
}

function handleError(error: unknown) {
  console.error('创建人格失败:', error)
}

onMounted(() => {
  loadFolderTree()
  loadPersonasInFolder(null)
})
</script>

<style scoped>
/* 样式继承自 BaseFolderItemSelector */
</style>
