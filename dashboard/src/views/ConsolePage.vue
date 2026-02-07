<script setup lang="ts">
import ConsoleDisplayer from '@/components/shared/ConsoleDisplayer.vue';
import { useModuleI18n } from '@/i18n/composables';
import axios from 'axios';

const { tm } = useModuleI18n('features/console');
</script>

<template>
  <div style="height: 100%">
    <div class="console-toolbar">
      <div class="console-toolbar__left">
        <h4>{{ tm('title') }}</h4>
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2 console-toolbar__hint"
        >
          {{ tm('debugHint.text') }}
        </v-alert>
      </div>
      <div class="console-toolbar__right d-flex align-center">
        <v-switch
          v-model="autoScrollEnabled"
          :label="
            autoScrollEnabled
              ? tm('autoScroll.enabled')
              : tm('autoScroll.disabled')
          "
          hide-details
          density="compact"
          color="primary"
          class="console-toolbar__switch"
        />
        <v-dialog v-model="pipDialog" width="400">
          <template #activator="{ props }">
            <v-btn variant="plain" v-bind="props">
              {{ tm('pipInstall.button') }}
            </v-btn>
          </template>
          <v-card>
            <v-card-title>
              <span class="text-h5">{{ tm('pipInstall.dialogTitle') }}</span>
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="pipInstallPayload.package"
                :label="tm('pipInstall.packageLabel')"
                variant="outlined"
              />
              <v-text-field
                v-model="pipInstallPayload.mirror"
                :label="tm('pipInstall.mirrorLabel')"
                variant="outlined"
              />
              <small>{{ tm('pipInstall.mirrorHint') }}</small>
              <div>
                <small>{{ pipStatus }}</small>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="blue-darken-1"
                variant="text"
                :loading="loading"
                @click="pipInstall"
              >
                {{ tm('pipInstall.installButton') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </div>
    <ConsoleDisplayer
      ref="consoleDisplayer"
      style="height: calc(100vh - 220px)"
    />
  </div>
</template>
<script lang="ts">
export default {
  name: 'ConsolePage',
  components: {
    ConsoleDisplayer,
  },
  data() {
    return {
      autoScrollEnabled: true,
      pipDialog: false,
      pipInstallPayload: {
        package: '',
        mirror: '',
      },
      loading: false,
      pipStatus: '',
    };
  },
  watch: {
    autoScrollEnabled(val) {
      if (this.$refs.consoleDisplayer) {
        const displayer = this.$refs.consoleDisplayer as
          | InstanceType<typeof ConsoleDisplayer>
          | undefined;
        if (displayer) displayer.autoScroll = val;
      }
    },
  },
  methods: {
    pipInstall() {
      this.loading = true;
      axios
        .post('/api/update/pip-install', this.pipInstallPayload)
        .then((res) => {
          this.pipStatus = res.data.message;
          setTimeout(() => {
            this.pipStatus = '';
            this.pipDialog = false;
          }, 2000);
        })
        .catch((err) => {
          this.pipStatus = err.response.data.message;
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
};
</script>

<style>
.console-toolbar {
  background-color: var(--v-theme-surface);
  padding: 8px;
  padding-left: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.console-toolbar__left {
  min-width: 0;
  flex: 1;
}

.console-toolbar__hint {
  max-width: 600px;
}

.console-toolbar__right {
  flex-shrink: 0;
  gap: 12px;
}

.console-toolbar__switch {
  margin-right: 0;
}

@media (max-width: 768px) {
  .console-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .console-toolbar__hint {
    max-width: 100%;
  }

  .console-toolbar__right {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 0.2s ease-in-out;
}
</style>
