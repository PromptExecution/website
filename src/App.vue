<script setup lang="ts">
import { ref, onMounted } from 'vue';
import CookieBanner from './components/CookieBanner.vue';

import CommandLineInterface from './components/CommandLineInterface.vue';
import PromptExecutionLogo from './components/PromptExecutionLogo.vue';
// import HelloWorld from './components/HelloWorld.vue'
// import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <CookieBanner v-if="showBanner" />
  <div>
    <PromptExecutionLogo />
  </div>
  <CommandLineInterface  />
  <!-- <HelloWorld msg="Vitex + Vue" /> -->
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
