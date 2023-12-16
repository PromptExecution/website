<!-- src/components/DebugPanel.vue -->
<template>
  <div class="debug-panel">
    <pre>{{ state }}</pre>
    <button @click="resetCookieConsent">Reset Cookie Consent</button>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from '../store';

const mainStore = useMainStore();
const state = mainStore.$state;

const resetCookieConsent = () => {
  mainStore.resetCookieConsent();
};
</script>

<style scoped>
.debug-panel {
  /* Add your styles for the debug panel here */
}
</style>

