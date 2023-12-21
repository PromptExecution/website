<!-- src/components/CommandLineInterface.vue -->
<!-- "git+ssh://github.com/ndabAP/vue-command#main", -->

<script setup lang="ts">
import VueCommand from "vue-command";
// import VueCommand from "../vue-command/dist/"
// const VueCommand = require('vue-command/dist/vue-command.common.js');
import "vue-command/dist/vue-command.css";

import { useMainStore } from '@/store/mainStore';
import { inject, ref, onMounted, onUnmounted } from 'vue';


import LoginPanel from './LoginPanel.vue';
import DebugPanel from './DebugPanel.vue';

const mainStore = useMainStore();  // pinia
let commandInput = ref('');

const commands = {
  "help": () => VueCommand.createStdout("Available commands: hello, login, debug"),
  "login": () => {
    mainStore.toggleLogin();
    return VueCommand.createStdout("Login interface activated.");
  },
  "hello": () => VueCommand.createStdout("Hello world! #wip"),
  "debug": () => {
    mainStore.toggleDebugPanel();
    return VueCommand.createStdout("Debug panel activated.");
  },
};

let idleTimer: number | undefined;
const idleDelay = 2500; // 5 seconds

const resetAndStartIdleTimer = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(onIdle, idleDelay) as unknown as number;
};

const onIdle = () => {
  // TODO: Trigger this when the text animation when the user is idle for > 5s
  console.log("onIdle ran");
  animateTextInjection("hello\n");
};



let typingTimer: number | undefined;
const typingDelay = 100; // milliseconds between each character

const animateTextInjection = (text: string, i: number = 0) => {
  if (i < text.length) {
    commandInput.value += text.charAt(i);
    i++;
    typingTimer = setTimeout(() => animateTextInjection(text, i), typingDelay) as unknown as number;
  } else {
    // Execute the command after the text has been typed
    commandInput.value;
    simulateEnterKeyPress();
    console.log("didSimulateEnterKeyPress")
    // Use this method to inject commands
    executeCommand(commandInput.value);
    // if (vueCommandRef.value) {
    //   vueCommandRef.value.executeCommand(command);
    //   }
  }
};

// Function to clear the ongoing text animation
const clearTextAnimation = () => {
  if (typingTimer !== undefined) {
    clearTimeout(typingTimer);
    typingTimer = undefined;
  }
};

const executeCommand = inject('executeCommand') as (command: string) => void;

const vueCommandRef = ref(null);


// Simulate Enter key press
const simulateEnterKeyPress = () => {
  // Find the input element within vue-command
  // const inputElement = vueCommandRef.value?.$el.querySelector('input');
  // console.log(inputElement);
  // if (inputElement) {
  //    // Create a synthetic 'Enter' key event
  //   const enterKeyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
  //   inputElement.dispatchEvent(enterKeyEvent);
  //   console.log("simulated enter key press")
  // }
  // else {
  //   console.log("else on simulated")
  // }
};


onMounted(() => {
  window.addEventListener('mousemove', resetAndStartIdleTimer);
  window.addEventListener('keydown', resetAndStartIdleTimer);
  resetAndStartIdleTimer(); // Start the timer when the component is mounted
});

onUnmounted(() => {
  window.removeEventListener('mousemove', resetAndStartIdleTimer);
  window.removeEventListener('keydown', resetAndStartIdleTimer);
  clearTimeout(idleTimer); // Clear the timer when the component is destroyed
  clearTextAnimation(); // Clear the text animation when the component is destroyed
});




</script>


<template>
  <div class="cli-container">

  <vue-command ref="vueCommandRef" :commands="commands" :query="commandInput" :hide-buttons="true" :show-help="true" :cursor-position="0" :is-fullscreen="true">
    <template #title>Command Line Interface v0.2 -- type "help" for instructions</template>
    <template #prompt>
      <span class="prompt">
        <span class="prompt-user">guest</span>
        <span class="prompt-path">~</span>
        <span class="prompt-symbol">$&nbsp;</span>
      </span>
    </template>
    <template #show-help>true</template>
    <template #help-text></template>
    <template #invert>true</template>
    <template #font></template>
  </vue-command>
    <LoginPanel v-if="mainStore.showLogin" />
    <DebugPanel v-if="mainStore.showDebugPanel" />
  </div>
</template>

<style scoped>
.cli-container {
  /* Adjust the border-radius as needed */
  border-radius: 10px; /* This will give rounded corners to the container */
  overflow: hidden; /* Ensures that the child elements adhere to the container's border radius */
}
</style>