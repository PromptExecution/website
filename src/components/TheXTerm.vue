<!--
FILE: src/components/TheXTerm.vue

* implements https://github.com/tzfun/vue-web-terminal

-->


<template>
  <div class="cli-container">
  <Terminal ref="terminalRef" class="Terminal" name="my-terminal"
    context="~"
    context-suffix=" $ "
    :init-log="initLog"
    :command-store="commandStore"
    @init-before="onInitBefore" @init-after="onInitAfter"
    @before-execute-command="onBeforeExecuteCommand"
    @exec-cmd="onExecCmd"
    :show-header="false"
    :enable-example-hint="false"
    title="👋🏻"
    theme="dark">
  </Terminal>
  </div>
</template>



<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'; // inject
import { getCurrentInstance, ComponentInternalInstance } from "vue";
// import { useSocketStoreWithOut } from '@/store/pinia/useSocketStore'
// In any module where you want to emit an event
import { emitter } from "@/eventBus";

import Terminal from "vue-web-terminal"
import { TerminalApi } from "vue-web-terminal"
import type { Command } from "vue-web-terminal"
// Theme is now controlled via component prop (v3.3.1+)


let idleTimer: number | undefined;
const idleDelay = 2500; // 5 seconds

const TerminalApiInstance = TerminalApi as any as TerminalApi;

const resetAndStartIdleTimer = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(onIdle, idleDelay) as unknown as number;
};

const handleMessage = (event: any) => {
    // Handle the incoming message
    console.log("handleMessage:", event);
    TerminalApiInstance.pushMessage("my-terminal",{
        type: 'json',
        content: JSON.stringify(event),
      })
    // TerminalApiInstance.execute('my-terminal', eventName);


};


const onIdle = () => {
  //  true or false
  // let fullscreen = TerminalApi.isFullscreen('my-terminal')
  console.log('User is idle. execute!');
  TerminalApiInstance.execute('my-terminal', 'hello')
};


// let typingTimer: number | undefined;
// const typingDelay = 100; // milliseconds between each character

/*
const animateTextInjection = (text: string, i: number = 0) => {
  if (!terminalRef.value || i >= text.length) return;

  let currentText = terminalRef.value.input + text.charAt(i);
  TerminalApi.pushMessage('my-terminal', { content: currentText, type: 'normal' });

  if (i === text.length - 1) {
    // Executing the command and clearing the input
    onExecCmd('commandKey', currentText, successCallback, failedCallback);
    TerminalApi.pushMessage('my-terminal', { content: '', type: 'normal' });
  } else {
    setTimeout(() => animateTextInjection(text, i + 1), typingDelay);
  }
};
*/
// Function to simulate the typing of a command
/*
const animateTextInjection = (text: string, i: number = 0) => {
  if (!terminalRef.value || i >= text.length) return;

  terminalRef.value.input += text.charAt(i); // Simulate typing

  if (i === text.length - 1) {
    // Once the entire command is typed, trigger the command execution
    onExecCmd('customKey', terminalRef.value.input, successCallback, failedCallback);
    terminalRef.value.input = ''; // Clear input after "execution"
  } else {
    // Continue typing the next character
    setTimeout(() => animateTextInjection(text, i + 1), typingDelay);
  }
};
*/


// Define the success callback
/*
const successCallback = (result: any) => {
  // Handle successful command execution
  console.log('Command executed successfully:', result);
};

// Define the failed callback
const failedCallback = (errorMessage: string) => {
  // Handle failed command execution
  console.error('Command execution failed:', errorMessage);
};
*/

const stopTextAnimation = () => {
  // if (typingTimer !== undefined) {
  //   clearTimeout(typingTimer);
  //   typingTimer = undefined;
  //  console.log('Text animation stopped');
  // }
};

// Function to clear the ongoing text animation
const clearTextAnimation = () => {
  // if (typingTimer !== undefined) {
  //   clearTimeout(typingTimer);
  //   typingTimer = undefined;
  // }
};

const onInitBefore = () => {
  console.log('Terminal is about to be initialized');
};

const onInitAfter = () => {
  console.log('Terminal has been initialized');
  // Start idle timer after terminal is initialized
  setTimeout(() => {
    resetAndStartIdleTimer();
  }, 500);
};

// const onBeforeExecuteCommand = (cmdKey, command: Command, name: String) => {
const onBeforeExecuteCommand = ({ command }: { command: Command }) => {
  console.log('Command is about to be executed:', command);
};


// const executeCommand = inject('executeCommand') as (command: string) => void;
// const vueCommandRef = ref(null);

// Update your event listeners to stop animation on activity
window.addEventListener('mousemove', () => {
  resetAndStartIdleTimer();
  stopTextAnimation();
});
window.addEventListener('keypress', () => {
  resetAndStartIdleTimer();
  stopTextAnimation();
});

onMounted(() => {
  // Don't start idle timer here - wait for terminal initialization

  emitter.on("webSocket.open", handleMessage);
  emitter.on("webSocket.onMessage", handleMessage);

  const instance = getCurrentInstance() as ComponentInternalInstance;
  setTimeout(() => {
      if (instance?.appContext.app.config.globalProperties.$socket) {
        // Socket already connected
        return;
      }
      // Connect via the global properties
      if (instance?.appContext.app.config.globalProperties.$connect) {
        instance.appContext.app.config.globalProperties.$connect();
      }
    }, 100);});

onUnmounted(() => {
  stopTextAnimation(); // Stop the text animation when the component is destroyed
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
  }
  else if (key === "hello") {
    success({
      type: 'normal',
      class: 'success',
      tag: '😁',
      content: 'world'
    })
  }
  else if (key === "meet") {
    // TODO: open a new window
    success({
      type: 'normal',
      class: 'success',
      tag: '👋🏻',
      content: '<a href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1PPmxcLlDdPZF1BMHQaADaO7or9b7sXrljq7co6Fu3bZLO9x_YmzH8JkynDEwzSrgdqh5Y-4s1">calendar</a>'
    })
  }
  else {
    let allClass = ['success', 'error', 'system', 'info', 'warning'];
    let clazz = allClass[Math.floor(Math.random() * allClass.length)];
    success({
      type: 'normal',
      class: clazz,
      tag: '😁',
      content: command
    });
  }
};

const initLog = [
  {
    type: 'normal',
    content: "Welcome to PromptExecution"
  },
  {
    type: 'normal',
    content: "<i>Type help</i>"
  }
]


const commandStore = [
  {
    key: 'hello',
    title: 'Prints "world" to the terminal.',
    usage: 'hello',
    example: [
      {
        cmd: 'hello',
        des: 'Prints "world" to the terminal.'
      }
    ],
    exec: () => {
      TerminalApiInstance.pushMessage("my-terminal",{
        type: 'normal',
        content: 'world',
      })
    }
  },
  {
    key: 'meet',
    title: 'Provides a meeting link.',
    usage: 'meet',
    example: [
      {
        cmd: 'meet',
        des: 'Lets meet',
      }
    ],
    exec: () => {
      // open a popup to the calendar
      //
    }
  }
]

</script>





<style scoped>


.cli-container {
  position: relative;
  background: linear-gradient(180deg, #4f4f4f 0%, #383838 35%, #2a2a2a 100%);
  color: white;
  border: 1px solid #6f6f6f;
  border-radius: 14px;
  padding: 4px;
  display: flex;
  flex: 1 1 auto;
  height: clamp(420px, calc(100dvh - 260px), 960px);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.cli-container::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 9px;
  pointer-events: none;
  background: repeating-linear-gradient(
    180deg,
    rgba(120, 255, 170, 0.03) 0px,
    rgba(120, 255, 170, 0.03) 2px,
    rgba(0, 0, 0, 0) 2px,
    rgba(0, 0, 0, 0) 4px
  );
}


.Terminal {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  text-align: left;
  width: 100%;
  height: 100%;
  min-height: 100%;
}

:deep(.t-container) {
  width: 100% !important;
  height: 100% !important;
  border-radius: 10px;
  border: 1px solid #4b4b4b;
  box-sizing: border-box;
  overflow: hidden;
}

:deep(.t-window) {
  display: flex;
  flex-direction: column;
  min-height: 100% !important;
  bottom: 0 !important;
  inset: 0 !important;
  padding: 8px 12px 10px 14px;
  box-sizing: border-box;
}

:deep(.t-last-line) {
  margin-top: auto !important;
  margin-bottom: 4px !important;
}

@media (max-width: 767px) {
  .cli-container {
    height: clamp(360px, calc(100dvh - 210px), 720px);
    padding: 3px;
  }

  :deep(.t-window) {
    padding: 8px 10px 9px 12px;
  }
}

</style>
