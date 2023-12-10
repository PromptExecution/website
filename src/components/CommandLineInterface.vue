<template>
  <vue-command :commands="commands" :hide-buttons="true" :cursor-position="0" :is-fullscreen="true">
    <template #title>bash - 720x350</template>
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
      "hello-world": () => createStdout("Hello world"),
    },
  }),
};
</script>

