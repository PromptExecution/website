<script setup lang="ts">
import CommandLineInterface from './components/CommandLineInterface.vue';
import PromptExecutionLogo from './components/PromptExecutionLogo.vue';
import Background3js from './components/Background3js.vue';
</script>

<template>
<div class="parentContainer">
  <div class="Background3js">
  <Background3js />
  </div>
  <div class="content-container">
    <PromptExecutionLogo />
    <CommandLineInterface  />
  </div>
</div>
</template>

<style scoped>
.content-container {
  z-index: 2; /* Higher than the background */
  position: absolute; /* Centering relative to the viewport */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* Center the content */
  max-width: 90%; /* Adjust as needed */
  max-height: 90%; /* Adjust as needed */
  overflow: auto;
}

.parent-container { /* Replace with actual parent container class or ID */
  overflow: visible; /* Or adjust as needed */
}
.Background3js {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0; /* Behind the content */
  background-color: #42b883aa;
}
.logo {
  height: 6em;
  margin: 3em;
  padding: 0.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
</style>
