import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-prototype-builtins': 'off',
    },
  },

  ...vue.configs['flat/essential'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-prototype-builtins': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'warn',
      'vue/no-unused-components': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
    },
  },

  // Gradual rollout: forbid explicit `any` in selected areas first.
  {
    files: [
      'src/components/folder/**/*.{ts,tsx,vue}',
      'src/views/persona/**/*.{ts,tsx,vue}',
      'src/components/shared/AstrBotConfigV4.vue',
      'src/components/shared/AstrBotConfig.vue',
      'src/components/shared/ChangelogDialog.vue',
      'src/components/shared/PersonaSelector.vue',
      'src/components/shared/KnowledgeBaseSelector.vue',
      'src/components/shared/ItemCardGrid.vue',
      'src/components/shared/ConsoleDisplayer.vue',
      'src/components/shared/TraceDisplayer.vue',
      'src/components/shared/T2ITemplateEditor.vue',
      'src/components/shared/MigrationDialog.vue',
      'src/components/shared/ConfigItemRenderer.vue',
      'src/components/shared/TemplateListEditor.vue',
      'src/components/shared/BackupDialog.vue',
      'src/components/shared/PersonaForm.vue',
      'src/views/SubAgentPage.vue',
      'src/views/CronJobPage.vue',
      'src/views/Settings.vue',
      'src/views/ProviderPage.vue',
      'src/views/PlatformPage.vue',
      'src/views/ConfigPage.vue',
      'src/views/SessionManagementPage.vue',
      'src/views/ConsolePage.vue',
      'src/views/authentication/auth/LoginPage.vue',
      'src/views/dashboards/default/DefaultDashboard.vue',
      'src/views/dashboards/default/components/MessageStat.vue',
      'src/views/knowledge-base/components/TavilyKeyDialog.vue',
      'src/views/knowledge-base/KBDetail.vue',
      'src/views/knowledge-base/DocumentDetail.vue',
      'src/views/knowledge-base/components/RetrievalTab.vue',
      'src/views/knowledge-base/KBList.vue',
      'src/views/knowledge-base/components/SettingsTab.vue',
      'src/views/knowledge-base/components/DocumentsTab.vue',
      'src/views/ConversationPage.vue',
      'src/components/header/UpdateDialog.vue',
    ],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
