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
import { deriveAccentColors } from '@/utils/themeColor';

const { tm } = useModuleI18n('features/settings');
const theme = useTheme();

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type ThemeColors = Record<string, unknown> & {
  primary?: string;
  secondary?: string;
  darkprimary?: string;
  darksecondary?: string;
};

type ThemeDefinition = Record<string, unknown> & {
  colors?: ThemeColors;
};

type ThemeDefinitions = Record<string, ThemeDefinition>;

const getStoredColor = (key: string, fallback: string): string => {
  const stored =
    typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  return stored || fallback;
};

const defaultPrimaryColor = PurpleTheme.colors.primary ?? '#38bdf8';

const primaryColor = ref(
  getStoredColor(
    'themePrimary',
    getStoredColor('themeSecondary', defaultPrimaryColor),
  ),
);

const resolveThemes = () => {
  const t: unknown = theme;
  if (!isRecord(t)) return null;

  const directThemes = isRecord(t.themes) ? t.themes.value : undefined;
  if (isRecord(directThemes)) return directThemes as ThemeDefinitions;

  const globalThemes =
    isRecord(t.global) && isRecord(t.global.themes)
      ? t.global.themes.value
      : undefined;
  if (isRecord(globalThemes)) return globalThemes as ThemeDefinitions;
  return null;
};

const applyThemeColors = (baseColor?: string) => {
  const themes = resolveThemes();
  if (!themes || !baseColor) return;

  const lightTheme = themes['PurpleTheme'];
  const darkTheme = themes['PurpleThemeDark'];
  if (!lightTheme?.colors || !darkTheme?.colors) return;

  const lightBg =
    (typeof lightTheme.colors.surface === 'string' &&
      lightTheme.colors.surface) ||
    (typeof lightTheme.colors.background === 'string' &&
      lightTheme.colors.background) ||
    '#ffffff';
  const darkBg =
    (typeof darkTheme.colors.surface === 'string' &&
      darkTheme.colors.surface) ||
    (typeof darkTheme.colors.background === 'string' &&
      darkTheme.colors.background) ||
    '#1f1f1f';

  const { lightPrimary, lightTextPrimary, darkPrimary } = deriveAccentColors(
    baseColor,
    lightBg,
    darkBg,
  );

  lightTheme.colors.primary = lightPrimary;
  lightTheme.colors.secondary = lightPrimary;
  if (typeof lightTheme.colors.darkprimary === 'string')
    lightTheme.colors.darkprimary = lightTextPrimary;
  if (typeof lightTheme.colors.darksecondary === 'string')
    lightTheme.colors.darksecondary = lightTextPrimary;

  darkTheme.colors.primary = darkPrimary;
  darkTheme.colors.secondary = darkPrimary;
};

applyThemeColors(primaryColor.value);

watch(primaryColor, (value) => {
  if (!value) return;
  localStorage.setItem('themePrimary', value);
  // Keep the legacy key in sync for backward compatibility.
  localStorage.setItem('themeSecondary', value);
  applyThemeColors(value);
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
  localStorage.removeItem('themePrimary');
  localStorage.removeItem('themeSecondary');
  applyThemeColors(primaryColor.value);
};
</script>
