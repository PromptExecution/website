<!--

    https://github.com/tzfun/vue-web-terminal?tab=readme-ov-file#Flash

-->


<script setup lang="ts">
import { inject,ref, onMounted, onUnmounted } from 'vue';
import { useMainStore } from '../store';
import Terminal from "vue-web-terminal"
// This style needs to be introduced in versions after 3.1.8 and 2.1.12.
// There is no need to introduce theme styles in previous versions.
// import 'vue-web-terminal/lib/theme/dark.css'
// import 'vue-web-terminal/lib/theme/light.css'

const mainStore = useMainStore();  // pinia
let commandInput = ref('');

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
    // executeCommand(commandInput.value);
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

// const executeCommand = inject('executeCommand') as (command: string) => void;

const vueCommandRef = ref(null);


// Simulate Enter key press
const simulateEnterKeyPress = () => {
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


// Define the types for the success and failed callback functions
type SuccessCallback = (result: { type: string; class: string; tag: string; content: string }) => void;
type FailedCallback = (errorMessage: string) => void;

// Define the type for the onExecCmd function
const onExecCmd = (
  key: string,
  command: string,
  success: SuccessCallback,
  failed: FailedCallback
) => {
  if (key === 'fail') {
    failed('Something wrong!!!');
  } else {
    let allClass = ['success', 'error', 'system', 'info', 'warning'];
    let clazz = allClass[Math.floor(Math.random() * allClass.length)];
    success({
      type: 'normal',
      class: clazz,
      tag: '成功',
      content: command
    });
  }
};

</script>




<template>
  <div id="app" class="Terminal">
  <Terminal name="my-terminal" :show-header="false" :enable-example-hint="false" title="👋🏻" >
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
  </Terminal>
  </div>
</template>


<style>

/* If Terminal component has its own alignment, target it specifically */
Terminal {
  text-align: left;  /* This assumes the component can be targeted like this */
}

.cli-container {
  /* Adjust the border-radius as needed */
  border-radius: 10px; /* This will give rounded corners to the container */
  overflow: hidden; /* Ensures that the child elements adhere to the container's border radius */
}

body, html, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  text-align: left;
}

:root {
    --t-main-background-color: #fff;
    --t-main-font-color: #000;
    --t-window-box-shadow: 0 0 40px 1px rgb(0 0 0 / 20%);
    --t-header-background-color: #4b474c;
    --t-header-font-color: white;
    --t-tag-font-color: #fff;
    --t-cursor-color: #000;
    --t-cmd-key-color: #834dff;
    --t-cmd-arg-color: #c0c0ff;
    --t-cmd-splitter-color: #808085;
    --t-link-color: #02505e;
    --t-link-hover-color: #17b2d2;
    --t-table-border: 1px dashed #565151;
    --t-selection-font-color: white;
    --t-selection-background-color: #2a2626;
    --t-cmd-help-background-color: white;
    --t-cmd-help-code-font-color: rgba(0,0,0,.8);
    --t-cmd-help-code-background-color: #f7f7f9;
    --t-cmd-help-msg-color: #c5a5a5;
    --t-cmd-help-box-shadow: 0px 0px 0px 4px rgb(0 0 0 / 20%);
    --t-text-editor-floor-background-color: rgba(0,0,0,.1);
    --t-text-editor-floor-close-btn-color: #9a7070;
    --t-text-editor-floor-save-btn-color: #00b10e;
    --t-text-editor-floor-btn-hover-color: #652222;
    --t-json-background-color: rgba(0, 0, 0, 0);
    --t-json-value-obj-color: #bdadad;
    --t-json-value-bool-color: #cdc83c;
    --t-json-value-number-color: #a625be;
    --t-json-ellipsis-background-color: #f5f5f5;
    --t-json-more-background-webkit: -webkit-linear-gradient(top, rgba(0, 0, 0, 0) 20%, rgb(255 255 255 / 10%) 100%);
    --t-json-more-background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 20%, rgb(255 255 255 / 10%) 100%);
    --t-json-deep-selector-border-color: rgb(249 249 249 / 52%);
    --t-code-default-background-color: rgb(227 239 248);
}

</style>