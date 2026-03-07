<!-- src/App.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import CookieBanner from '@/components/CookieBanner.vue';
import CircuitBackground from '@/components/CircuitBackground.vue';
import PromptExecutionLogo from '@/components/PromptExecutionLogo.vue';
import Win95TabContainer from '@/components/Win95TabContainer.vue';
import { useMainStore } from '@/store/mainStore';

const mainStore = useMainStore();
const showUiShell = ref(true);

const handleHideUiShell = () => {
  showUiShell.value = false;
};

// Example of how you might control the visibility of the banner
// This is just a placeholder logic, adjust according to your needs
onMounted(() => {
  // Logic to determine if the banner should be shown
  // For example, check if the user has already accepted cookies
  // showBanner.value = ...;
  window.addEventListener('pe-hide-ui-shell', handleHideUiShell);
});
import TheFooter from './components/TheFooter.vue';

onUnmounted(() => {
  window.removeEventListener('pe-hide-ui-shell', handleHideUiShell);
});

</script>

<template>
  <div class="app-shell">
    <CircuitBackground />
    <div v-if="showUiShell" class="app-content">
      <div>
        <PromptExecutionLogo />
      </div>

      <!-- Win95-style tabbed interface with Comic, Archive, Subscribe, and CLI tabs -->
      <Win95TabContainer />

      <TheFooter />

      <CookieBanner v-if="!mainStore.isCookieConsentSet" />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
}

.app-content {
  position: relative;
  z-index: 1;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
/* .logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
*/


</style>
