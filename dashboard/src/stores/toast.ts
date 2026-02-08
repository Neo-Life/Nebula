import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type ToastColor =
  | 'info'
  | 'success'
  | 'error'
  | 'primary'
  | 'warning'
  | (string & {});

type ToastBlockLocation = 'top' | 'bottom';
type ToastInlineLocation = 'start' | 'end' | 'left' | 'right';
export type ToastLocation =
  | ToastBlockLocation
  | ToastInlineLocation
  | 'center'
  | 'center center'
  | `${ToastBlockLocation} ${ToastInlineLocation | 'center'}`
  | `${ToastInlineLocation} ${ToastBlockLocation | 'center'}`;

export type ToastOptions = {
  timeout?: number;
  closable?: boolean;
  multiLine?: boolean;
  location?: ToastLocation;
};

export type ToastItem = {
  message: string;
  color: ToastColor;
  timeout: number;
  closable: boolean;
  multiLine: boolean;
  location: ToastLocation;
};

export type ToastInput = { message: string; color?: ToastColor } & ToastOptions;

export const useToastStore = defineStore('toast', () => {
  const queue = ref<ToastItem[]>([]);
  const current = computed<ToastItem | undefined>(() => queue.value[0]);

  function add({
    message,
    color = 'info', // Vuetify 颜色
    timeout = 3000,
    closable = true,
    multiLine = false,
    location = 'top center',
  }: ToastInput) {
    queue.value.push({
      message,
      color,
      timeout,
      closable,
      multiLine,
      location,
    });
  }

  function shift() {
    queue.value.shift();
  }

  return { current, add, shift };
});
