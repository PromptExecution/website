<!-- src/App.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import CookieBanner from './components/CookieBanner.vue';

import CommandLineInterface from './components/CommandLineInterface.vue';
import PromptExecutionLogo from './components/PromptExecutionLogo.vue';

import { useMainStore } from './store';
const mainStore = useMainStore();

// Example of how you might control the visibility of the banner
// This is just a placeholder logic, adjust according to your needs
onMounted(() => {
  // Logic to determine if the banner should be shown
  // For example, check if the user has already accepted cookies
  // showBanner.value = ...;
});


import TheFooter from './components/TheFooter.vue';
import TheNavigation from './components/TheNavigation.vue';


</script>

<template>

  <router-view></router-view>
  <TheNavigation />

  <div>
    <PromptExecutionLogo />
  </div>
  <CommandLineInterface  />
  <TheFooter />

  <CookieBanner v-if="!mainStore.isCookieConsentSet" />
</template>

<style scoped>
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
