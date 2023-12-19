<!--

    https://github.com/tzfun/vue-web-terminal?tab=readme-ov-file#Flash

-->

<template>
    <div id="app">
    <Terminal name="my-terminal" ></Terminal>
    hello2
    </div>
</template>

<script lang="ts">
import { inject,ref, onMounted, onUnmounted } from 'vue';
import { useMainStore } from '../store';
import Terminal from "vue-web-terminal"
// This style needs to be introduced in versions after 3.1.8 and 2.1.12.
// There is no need to introduce theme styles in previous versions.
// import 'vue-web-terminal/lib/theme/dark.css'
//  import light theme
import 'vue-web-terminal/lib/theme/light.css'

export default {
  name: 'App',
  components: {Terminal},
  methods: {
    onExecCmd(key, command, success, failed) {
      if (key === 'fail') {
        failed('Something wrong!!!')
      } else {
        let allClass = ['success', 'error', 'system', 'info', 'warning'];

        let clazz = allClass[Math.floor(Math.random() * allClass.length)];
        success({
          type: 'normal',
          class: clazz,
          tag: '成功',
          content: command
        })
      }
    }
  }
}
</script>