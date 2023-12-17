<template>
  <div class="debug-panel">
    <h3>🕵️ Secret Debuggin Panel</h3>
    <pre class="state-display">{{ formattedState }}</pre>
    <button @click="resetCookieConsent">Reset Cookie Consent</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMainStore } from '../store';

const mainStore = useMainStore();
// const config = mainStore.config; // Access configuration

const formattedState = computed(() => {
  return JSON.stringify(mainStore.$state, null, 2);
});

const resetCookieConsent = () => {
  mainStore.resetCookieConsent();
};
</script>

<style scoped>
.debug-panel {
  background-color: #f8f8f8;
  border: 1px solid #ccc;
  padding: 15px;
  border-radius: 10px;
  margin-top: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  color: #333; /* Default text color for the panel */
}

.debug-panel h3 {
  margin-top: 0;
}

.debug-panel pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #eee; /* Light background for the text area */
  padding: 10px;
  border-radius: 5px;
  color: #333; /* Ensuring text color is readable against the light background */
}

.debug-panel button {
  margin-top: 10px;
  /* Additional button styling */
}
</style>
