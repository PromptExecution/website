<script setup lang="ts">
import VueCommand, { createStdout } from "vue-command";
import "vue-command/dist/vue-command.css";
import { useMainStore } from '../store';
import LoginPanel from './LoginPanel.vue';
import DebugPanel from './DebugPanel.vue';

const mainStore = useMainStore();

const commands = {
  "help": () => createStdout("Available commands: hello, login, debug"),
  "login": () => {
    mainStore.toggleLogin();
    const status = mainStore.showLogin ? "Activated" : "Disabled";
    return createStdout(`Login interface ${status}.`);
    },
  "hello": () => createStdout("Hello world! #wip"),
  "debug": () => {
    mainStore.toggleDebugPanel();
    const status = mainStore.showDebugPanel ? "Activated" : "Disabled";
    return createStdout(`Debug panel ${status}.`);
    },
};
</script>

<template>
  <div class="cli-container">
    <vue-command :commands="commands" :hide-buttons="true" :show-help="true" :cursor-position="0" :is-fullscreen="true">
    <template #title>Command Line Interface v0.2 -- type "help" for instructions</template>
    <template #prompt>
      <span class="prompt">
        <span class="prompt-user">guest</span>
        <span class="prompt-path">~</span>
        <span class="prompt-symbol">$&nbsp;</span>
      </span>
    </template>
    <template #show-help>true</template>
    <template #help-text>asdfasdf</template>
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