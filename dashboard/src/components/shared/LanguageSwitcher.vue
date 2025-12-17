<template>
  <v-menu offset="12" location="bottom center">
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        :variant="(props.variant === 'header' || props.variant === 'chatbox') ? 'flat' : 'text'"
        :color="(props.variant === 'header' || props.variant === 'chatbox') ? 'var(--v-theme-surface)' : undefined"
        :rounded="(props.variant === 'header' || props.variant === 'chatbox') ? 'sm' : undefined"
        icon
        size="small"
        :class="['language-switcher', `language-switcher--${props.variant}`, (props.variant === 'header' || props.variant === 'chatbox') ? 'action-btn' : '']"
      >
        <v-icon 
          size="18"
          :color="iconColor"
        >
          mdi-translate
        </v-icon>
      </v-btn>
    </template>
    
    <v-card class="language-dropdown" elevation="8" rounded="lg">
      <v-list density="compact" class="pa-1">
        <v-list-item
          v-for="lang in languages"
          :key="lang.code"
          :value="lang.code"
          @click="changeLanguage(lang.code)"
          :class="{ 'v-list-item--active': currentLocale === lang.code, 'language-item-selected': currentLocale === lang.code }"
          class="language-item"
          rounded="md"
        >
          <template v-slot:prepend>
            <span class="language-flag">{{ lang.flag }}</span>
          </template>
          <v-list-item-title>{{ lang.name }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLanguageSwitcher } from '@/i18n/composables'
import type { Locale } from '@/i18n/types'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'header' | 'chatbox'
  color?: string | undefined
}>(), {
  variant: 'default',
  color: undefined
})

const { languageOptions, switchLanguage, locale } = useLanguageSwitcher()

const iconColor = computed(() => props.color ?? (props.variant === 'default' ? 'primary' : undefined))

const languages = computed(() => 
  languageOptions.value.map(lang => ({
    code: lang.value,
    name: lang.label,
    flag: lang.flag
  }))
)

const currentLocale = computed(() => locale.value)

const changeLanguage = async (langCode: string) => {
  await switchLanguage(langCode as Locale)
}
</script>

<style scoped>
.language-flag {
  font-size: 16px;
  margin-right: 8px;
}

/* 默认变体样式 - 圆形按钮用于登录页 */

.language-switcher--default {
  margin: 0;
  border-radius: 50% !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  background: transparent !important;
  transition: background-color 0.25s ease;
}

.language-switcher--default:hover,
.language-switcher--default:focus-visible {
  background: rgba(var(--v-theme-primary), 0.16) !important;
}

/* 深色模式下的悬停效果（仅对default变体） */
:deep(.v-theme--PurpleThemeDark) .language-switcher--default:hover,
:deep(.v-theme--PurpleThemeDark) .language-switcher--default:focus-visible {
  background: rgba(var(--v-theme-primary), 0.24) !important;
}

.language-dropdown {
  min-width: 100px;
  width: fit-content;
  border: 1px solid rgba(var(--v-theme-primary), 0.15) !important;
  background: rgb(var(--v-theme-surface)) !important;
  backdrop-filter: blur(10px);
}

/* 深色模式下的下拉框样式 */
:deep(.v-theme--PurpleThemeDark) .language-dropdown {
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.32) !important;
}

.language-item {
  margin: 2px 0;
  transition: all 0.2s ease;
}

.language-item:hover {
  background: rgba(var(--v-theme-primary), 0.12) !important;
}

.language-item-selected {
  background: rgba(var(--v-theme-primary), 0.18) !important;
  font-weight: 500;
}

.language-item-selected:hover {
  background: rgba(var(--v-theme-primary), 0.24) !important;
}

/* 深色模式下的列表项悬停效果 */
:deep(.v-theme--PurpleThemeDark) .language-item:hover {
  background: rgba(var(--v-theme-primary), 0.18) !important;
}

:deep(.v-theme--PurpleThemeDark) .language-item-selected {
  background: rgba(var(--v-theme-primary), 0.26) !important;
}

:deep(.v-theme--PurpleThemeDark) .language-item-selected:hover {
  background: rgba(var(--v-theme-primary), 0.32) !important;
}
</style> 