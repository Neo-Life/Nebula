<script lang="ts">
import { defineComponent } from "vue";
import TraceDisplayer from "@/components/shared/TraceDisplayer.vue";

export default defineComponent({
  name: "TracePage",
  components: {
    TraceDisplayer,
  },
});
</script>

<template>
  <div style="height: 100%;">
    <TraceDisplayer />
  </div>
</template>
