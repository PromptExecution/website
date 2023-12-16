<!-- src/App.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import CookieBanner from './components/CookieBanner.vue';

import CommandLineInterface from './components/CommandLineInterface.vue';
import PromptExecutionLogo from './components/PromptExecutionLogo.vue';
// import HelloWorld from './components/HelloWorld.vue'
// import HelloWorld from './components/HelloWorld.vue'

const showBanner = ref(true); // Or whatever logic you need to show/hide the banner

// Example of how you might control the visibility of the banner
// This is just a placeholder logic, adjust according to your needs
onMounted(() => {
  // Logic to determine if the banner should be shown
  // For example, check if the user has already accepted cookies
  // showBanner.value = ...;
});

</script>

<template>
  <div>
    <PromptExecutionLogo />
  </div>
  <CommandLineInterface  />
  <CookieBanner v-if="showBanner" />
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
} */
</style>
