<template>
  <div class="skills-page">
    <v-container fluid class="pa-0" elevation="0">
      <v-row class="d-flex justify-space-between align-center px-4 py-3 pb-8">
        <div>
          <v-btn color="success" prepend-icon="mdi-upload" class="me-2" variant="tonal"
            @click="uploadDialog = true">
            {{ tm('skills.upload') }}
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-refresh" variant="tonal" @click="fetchSkills">
            {{ tm('skills.refresh') }}
          </v-btn>
        </div>
      </v-row>

      <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

      <div v-else-if="skills.length === 0" class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-folder-open</v-icon>
        <p class="text-grey mt-4">{{ tm('skills.empty') }}</p>
        <small class="text-grey">{{ tm('skills.emptyHint') }}</small>
      </div>

      <v-row v-else>
        <v-col v-for="skill in skills" :key="skill.name" cols="12" md="6" lg="4" xl="3">
          <item-card :item="skill" title-field="name" enabled-field="active" title-class="text-h3" :loading="itemLoading[skill.name] || false"
            :show-edit-button="false" @toggle-enabled="toggleSkill" @delete="confirmDelete">
            <template v-slot:item-details="{ item }">
              <div
                class="text-caption text-medium-emphasis mb-2 skill-description"
                :title="item.description || tm('skills.noDescription')"
              >
                <v-icon size="small" class="me-1">mdi-text</v-icon>
                {{ item.description || tm('skills.noDescription') }}
              </div>
              <div class="text-caption text-medium-emphasis skill-path" :title="item.path">
                <v-icon size="small" class="me-1">mdi-file-document</v-icon>
                {{ tm('skills.path') }}: {{ item.path }}
              </div>
            </template>
          </item-card>
        </v-col>
      </v-row>
    </v-container>

    <v-dialog v-model="uploadDialog" max-width="520px" persistent>
      <v-card>
        <v-card-title>{{ tm('skills.uploadDialogTitle') }}</v-card-title>
        <v-card-text>
          <small class="text-grey">{{ tm('skills.uploadHint') }}</small>
          <v-file-input
            v-model="uploadFile"
            accept=".zip"
            :label="tm('skills.selectFile')"
            variant="outlined"
            class="mt-4"
            :multiple="false"
          >
            <template #prepend>
              <v-icon size="small">mdi-file-zip</v-icon>
            </template>
          </v-file-input>
        </v-card-text>
        <v-card-actions class="d-flex justify-end">
          <v-btn variant="text" @click="uploadDialog = false">{{ tm('skills.cancel') }}</v-btn>
          <v-btn color="primary" :loading="uploading" :disabled="!uploadFile" @click="uploadSkill">
            {{ tm('skills.confirmUpload') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>{{ tm('skills.deleteTitle') }}</v-card-title>
        <v-card-text>{{ tm('skills.deleteMessage') }}</v-card-text>
        <v-card-actions class="d-flex justify-end">
          <v-btn variant="text" @click="deleteDialog = false">{{ tm('skills.cancel') }}</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteSkill">
            {{ t('core.common.itemCard.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="3000" :color="snackbar.color" elevation="24">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import axios, { type AxiosResponse } from "axios";
import { defineComponent, onMounted, reactive, ref } from "vue";
import ItemCard from "@/components/shared/ItemCard.vue";
import { useI18n, useModuleI18n } from "@/i18n/composables";

type ApiResponse<T> = {
  status: "ok" | "error";
  message?: string | null;
  data?: T;
};

type SkillItem = {
  name: string;
  description: string;
  path: string;
  active: boolean;
};

export default defineComponent({
  name: "SkillsSection",
  components: { ItemCard },
  setup() {
    const { t } = useI18n();
    const { tm } = useModuleI18n("features/extension");

    const skills = ref<SkillItem[]>([]);
    const loading = ref(false);
    const uploading = ref(false);
    const uploadDialog = ref(false);
    const uploadFile = ref<File | File[] | null>(null);
    const itemLoading = reactive<Record<string, boolean>>({});
    const deleteDialog = ref(false);
    const deleting = ref(false);
    const skillToDelete = ref<SkillItem | null>(null);
    const snackbar = reactive<{ show: boolean; message: string; color: string }>({
      show: false,
      message: "",
      color: "success",
    });

    const showMessage = (message: string, color: string = "success") => {
      snackbar.message = message;
      snackbar.color = color;
      snackbar.show = true;
    };

    const assertOk = <T,>(res: AxiosResponse<ApiResponse<T>>): ApiResponse<T> => {
      const status = res?.data?.status;
      if (status !== "ok") {
        const msg = res?.data?.message || "Request failed";
        throw new Error(msg);
      }
      return res.data;
    };

    const fetchSkills = async () => {
      const startedAt = Date.now();
      const minLoadingMs = 800;
      loading.value = true;
      try {
        const res = await axios.get<ApiResponse<SkillItem[]>>("/api/skills");
        const data = assertOk(res);
        skills.value = data.data || [];
      } catch (err) {
        showMessage((err as any)?.message || tm("skills.loadFailed"), "error");
      }

      const elapsed = Date.now() - startedAt;
      const remaining = minLoadingMs - elapsed;
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }

      loading.value = false;
    };

    const handleApiResponse = <T,>(
      res: AxiosResponse<ApiResponse<T>>,
      successMessage: string,
      failureMessageDefault: string,
      onSuccess?: () => void | Promise<void>
    ): void => {
      if (res?.data?.status === "ok") {
        showMessage(successMessage, "success");
        void onSuccess?.();
        return;
      }

      const msg = res?.data?.message || failureMessageDefault;
      showMessage(msg, "error");
    };

    const uploadSkill = async () => {
      if (!uploadFile.value) return;
      uploading.value = true;
      try {
        const formData = new FormData();
        const file = Array.isArray(uploadFile.value)
          ? uploadFile.value[0]
          : uploadFile.value;
        if (!file) {
          uploading.value = false;
          return;
        }
        formData.append("file", file);
        const res = await axios.post<ApiResponse<{ name: string }>>(
          "/api/skills/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        handleApiResponse(
          res,
          tm("skills.uploadSuccess"),
          tm("skills.uploadFailed"),
          async () => {
            uploadDialog.value = false;
            uploadFile.value = null;
            await fetchSkills();
          }
        );
      } catch (err) {
        showMessage((err as any)?.message || tm("skills.uploadFailed"), "error");
      } finally {
        uploading.value = false;
      }
    };

    const toggleSkill = async (skill: SkillItem) => {
      const nextActive = !skill.active;
      itemLoading[skill.name] = true;
      try {
        const res = await axios.post<ApiResponse<{ name: string; active: boolean }>>(
          "/api/skills/update",
          {
            name: skill.name,
            active: nextActive,
          }
        );
        handleApiResponse(
          res,
          tm("skills.updateSuccess"),
          tm("skills.updateFailed"),
          () => {
            skill.active = nextActive;
          }
        );
      } catch (err) {
        showMessage((err as any)?.message || tm("skills.updateFailed"), "error");
      } finally {
        itemLoading[skill.name] = false;
      }
    };

    const confirmDelete = (skill: SkillItem) => {
      skillToDelete.value = skill;
      deleteDialog.value = true;
    };

    const deleteSkill = async () => {
      if (!skillToDelete.value) return;
      deleting.value = true;
      try {
        const res = await axios.post<ApiResponse<{ name: string }>>(
          "/api/skills/delete",
          {
            name: skillToDelete.value.name,
          }
        );
        handleApiResponse(
          res,
          tm("skills.deleteSuccess"),
          tm("skills.deleteFailed"),
          async () => {
            deleteDialog.value = false;
            await fetchSkills();
          }
        );
      } catch (err) {
        showMessage((err as any)?.message || tm("skills.deleteFailed"), "error");
      } finally {
        deleting.value = false;
      }
    };

    onMounted(fetchSkills);

    return {
      t,
      tm,
      skills,
      loading,
      uploadDialog,
      uploadFile,
      uploading,
      itemLoading,
      deleteDialog,
      deleting,
      snackbar,
      fetchSkills,
      uploadSkill,
      toggleSkill,
      confirmDelete,
      deleteSkill,
    };
  },
});
</script>

<style scoped>
.skill-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.skill-path {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
