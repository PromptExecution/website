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
   :show-header="false" :enable-example-hint="false" title="👋🏻" >
  </Terminal>
  </div>
</template>



<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'; // inject
import { getCurrentInstance, ComponentInternalInstance } from "vue";
// import { useSocketStoreWithOut } from '@/store/pinia/useSocketStore'
// In any module where you want to emit an event
import { emitter } from "@/eventBus";

import Terminal, { Command, TerminalApi } from "vue-web-terminal"
// This style needs to be introduced in versions after 3.1.8 and 2.1.12.
// There is no need to introduce theme styles in previous versions.
import 'vue-web-terminal/lib/theme/dark.css'
// import 'vue-web-terminal/lib/theme/light.css'


let idleTimer: number | undefined;
const idleDelay = 2500; // 5 seconds

const TerminalApiInstance = TerminalApi as any as TerminalApi;

const resetAndStartIdleTimer = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(onIdle, idleDelay) as unknown as number;
};

const handleMessage = (event) => {
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
  //
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
  resetAndStartIdleTimer(); // Start the timer when the component is mounted

  emitter.on("webSocket.open", handleMessage);
  emitter.on("webSocket.onMessage", handleMessage);

  const { proxy } = getCurrentInstance() as ComponentInternalInstance;
  setTimeout(() => {
      if (proxy == null) return;
      proxy.$connect();
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





<style>


.cli-container {
  /* Adjust the border-radius as needed */
  /* overflow: hidden; /* Ensures that the child elements adhere to the container's border radius */
  background-color: black;
  color: white;
  border-radius: 10px; /* This will give rounded corners to the container */
  padding: 10px;
  height: 200px;
}


.Terminal {
  margin: 3;
  padding: 3;
  text-align: left;
}


</style>