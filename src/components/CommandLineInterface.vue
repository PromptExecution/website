<template>
  <vue-command :commands="commands" :hide-buttons="true" :show-help="true" :cursor-position="0" :is-fullscreen="true">
    <template #title>Command Line Interface v0.1 -- type "help" for instructions</template>
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
</template>

<script lang="ts">
// https://github.com/ndabAP/vue-command
import VueCommand, { createStdout } from "vue-command";
import "vue-command/dist/vue-command.css";

export default {
  components: {
    VueCommand,
  },

  data: () => ({
    commands: {
      "help": () => createStdout("Available commands: hello, login"),
      "login": () => createStdout("Login not available"),
      "hello": () => createStdout("Hello world! #wip"),
    },
  }),
};
</script>

