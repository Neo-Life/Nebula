<template>
  <RouterView />

  <!-- 全局唯一 snackbar -->
  <v-snackbar
    v-if="toastStore.current"
    v-model="snackbarShow"
    :color="toastStore.current.color"
    :timeout="toastStore.current.timeout"
    :multi-line="toastStore.current.multiLine"
    :location="(toastStore.current.location as any)"
    close-on-back
  >
    {{ toastStore.current.message }}
    <template
      v-if="toastStore.current.closable"
      #actions
    >
      <v-btn
        variant="text"
        @click="snackbarShow = false"
      >
        关闭
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { computed } from 'vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const snackbarShow = computed({
  get: () => !!toastStore.current,
  set: (val) => {
    if (!val) toastStore.shift()
  }
})
</script>
