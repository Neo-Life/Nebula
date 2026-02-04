<template>
  <div
    style="
      background-color: var(--v-theme-surface, #fff);
      padding: 8px;
      padding-left: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    "
  >
    <v-list lines="two">
      <v-list-subheader>{{ tm('network.title') }}</v-list-subheader>

      <v-list-item>
        <ProxySelector />
      </v-list-item>

      <v-list-subheader>{{ tm('sidebar.title') }}</v-list-subheader>

      <v-list-item
        :subtitle="tm('sidebar.customize.subtitle')"
        :title="tm('sidebar.customize.title')"
      >
        <SidebarCustomizer />
      </v-list-item>

      <v-list-subheader>{{ tm('theme.title') }}</v-list-subheader>

      <v-list-item
        :subtitle="tm('theme.subtitle')"
        :title="tm('theme.customize.title')"
      >
        <v-row class="mt-2" dense>
          <v-col cols="4" sm="2">
            <v-text-field
              v-model="primaryColor"
              type="color"
              :label="tm('theme.customize.primary')"
              hide-details
              variant="outlined"
              density="compact"
              style="max-width: 220px"
            />
          </v-col>
          <v-col cols="4" sm="2">
            <v-text-field
              v-model="secondaryColor"
              type="color"
              :label="tm('theme.customize.secondary')"
              hide-details
              variant="outlined"
              density="compact"
              style="max-width: 220px"
            />
          </v-col>
          <v-col cols="12">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              @click="resetThemeColors"
            >
              <v-icon class="mr-2"> mdi-restore </v-icon>
              {{ tm('theme.customize.reset') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-list-item>

      <v-list-subheader>{{ tm('system.title') }}</v-list-subheader>

      <v-list-item
        :subtitle="tm('system.backup.subtitle')"
        :title="tm('system.backup.title')"
      >
        <v-btn
          style="margin-top: 16px"
          color="primary"
          @click="openBackupDialog"
        >
          <v-icon class="mr-2"> mdi-backup-restore </v-icon>
          {{ tm('system.backup.button') }}
        </v-btn>
      </v-list-item>

      <v-list-item
        :subtitle="tm('system.restart.subtitle')"
        :title="tm('system.restart.title')"
      >
        <v-btn style="margin-top: 16px" color="error" @click="restartAstrBot">
          {{ tm('system.restart.button') }}
        </v-btn>
      </v-list-item>

      <v-list-item
        :subtitle="tm('system.migration.subtitle')"
        :title="tm('system.migration.title')"
      >
        <v-btn style="margin-top: 16px" color="primary" @click="startMigration">
          {{ tm('system.migration.button') }}
        </v-btn>
      </v-list-item>
    </v-list>
  </div>

  <WaitingForRestart ref="wfr" />
  <MigrationDialog ref="migrationDialog" />
  <BackupDialog ref="backupDialog" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import axios from 'axios';
import WaitingForRestart from '@/components/shared/WaitingForRestart.vue';
import ProxySelector from '@/components/shared/ProxySelector.vue';
import MigrationDialog from '@/components/shared/MigrationDialog.vue';
import SidebarCustomizer from '@/components/shared/SidebarCustomizer.vue';
import BackupDialog from '@/components/shared/BackupDialog.vue';
import { useModuleI18n } from '@/i18n/composables';
import { useTheme } from 'vuetify';
import { PurpleTheme } from '@/theme/LightTheme';

const { tm } = useModuleI18n('features/settings');
const theme = useTheme();

const getStoredColor = (key: string, fallback: string): string => {
  const stored =
    typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  return stored || fallback;
};

const defaultPrimaryColor = PurpleTheme.colors.primary ?? '#38bdf8';
const defaultSecondaryColor = PurpleTheme.colors.secondary ?? '#0ea5e9';

const primaryColor = ref(getStoredColor('themePrimary', defaultPrimaryColor));
const secondaryColor = ref(
  getStoredColor('themeSecondary', defaultSecondaryColor),
);

const resolveThemes = () => {
  if ((theme as any)?.themes?.value) return (theme as any).themes.value;
  if ((theme as any)?.global?.themes?.value)
    return (theme as any).global.themes.value;
  return null;
};

const applyThemeColors = (primary?: string, secondary?: string) => {
  const themes = resolveThemes();
  if (!themes) return;
  ['PurpleTheme', 'PurpleThemeDark'].forEach((name) => {
    const themeDef = themes[name];
    if (!themeDef?.colors) return;
    if (primary) themeDef.colors.primary = primary;
    if (secondary) themeDef.colors.secondary = secondary;
    if (primary && themeDef.colors.darkprimary)
      themeDef.colors.darkprimary = primary;
    if (secondary && themeDef.colors.darksecondary)
      themeDef.colors.darksecondary = secondary;
  });
};

applyThemeColors(primaryColor.value, secondaryColor.value);

watch(primaryColor, (value) => {
  if (!value) return;
  localStorage.setItem('themePrimary', value);
  applyThemeColors(value, secondaryColor.value);
});

watch(secondaryColor, (value) => {
  if (!value) return;
  localStorage.setItem('themeSecondary', value);
  applyThemeColors(primaryColor.value, value);
});

const wfr = ref<InstanceType<typeof WaitingForRestart> | null>(null);
const migrationDialog = ref<InstanceType<typeof MigrationDialog> | null>(null);
const backupDialog = ref<InstanceType<typeof BackupDialog> | null>(null);

const restartAstrBot = () => {
  axios.post('/api/stat/restart-core').then(() => {
    wfr.value?.check();
  });
};

const startMigration = async () => {
  const dialog = migrationDialog.value;
  if (!dialog) return;

  try {
    const result = await (dialog.open() as Promise<{
      success?: boolean;
      message?: string;
    }>);
    if (result.success) {
      console.log('Migration completed successfully:', result.message);
    }
  } catch (error) {
    console.error('Migration dialog error:', error);
  }
};

const openBackupDialog = () => {
  backupDialog.value?.open();
};

const resetThemeColors = () => {
  primaryColor.value = defaultPrimaryColor;
  secondaryColor.value = defaultSecondaryColor;
  localStorage.removeItem('themePrimary');
  localStorage.removeItem('themeSecondary');
  applyThemeColors(primaryColor.value, secondaryColor.value);
};
</script>
