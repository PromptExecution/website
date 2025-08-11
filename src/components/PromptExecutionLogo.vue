<script setup lang="ts">
// import { ref } from 'vue'
// defineProps<{ msg: string }>()
// const count = ref(0)
</script>

<template>
    <div class="logo-wrapper">
        <div class="logo-container">
            <img src="/PromptExecution-LogoV2-full-transparent.webp" class="logo-head" alt="Cybernetic Head"/>
            <div class="text-container">
                <div class="logo-title">PROMPT EXECUTION</div>
                <div class="logo-subtitle">COGNITIVE ROBOTIC PROCESS AUTOMATION</div>
            </div>
        </div>
    </div>
</template>

<style scoped>

/* Font imports for logo text */
@import url('https://db.onlinewebfonts.com/c/3bc7046035df293d6486e481022b043e?family=Patron');

@font-face {
  font-family: 'Patron-PersonalUse-Regular';
  src: url('https://db.onlinewebfonts.com/c/3bc7046035df293d6486e481022b043e?family=Patron') format('truetype');
}

@font-face {
  font-family: 'Patron - Personal Use';
  src: url('https://db.onlinewebfonts.com/c/3bc7046035df293d6486e481022b043e?family=Patron') format('truetype');
}

@font-face {
  font-family: 'ExodarOutline';
  src: url('/fonts/Exodar-Outline.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Exodar-Outline';
  src: url('/fonts/Exodar-Outline.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
}

.logo-container {
    display: flex;
    align-items: center;
    height: 122px;
}

.logo-head {
    width: 100px;
    height: 100px;
    margin-right: 10px;
}

.text-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.logo-title {
    font-family: 'Patron-PersonalUse-Regular', 'Patron - Personal Use', 'Patron', serif;
    font-size: 67px;
    font-weight: normal;
    color: black;
    white-space: nowrap;
    line-height: 1.0;
    letter-spacing: 0.02em;
}

.logo-subtitle {
    font-family: 'ExodarOutline', 'Exodar-Outline', monospace;
    font-size: 41px;
    font-weight: normal;
    color: transparent;
    -webkit-text-stroke: 1.31px rgb(117, 126, 127);
    text-stroke: 1.31px rgb(117, 126, 127);
    white-space: nowrap;
    line-height: 1.0;
    letter-spacing: 0.02em;
}

@keyframes rainbow-pulse {
  0% { filter: drop-shadow(0 0 2px hsl(0, 100%, 50%)); }
  16% { filter: drop-shadow(0 0 3px hsl(60, 100%, 50%)); }
  33% { filter: drop-shadow(0 0 2px hsl(120, 100%, 50%)); }
  50% { filter: drop-shadow(0 0 5px hsl(180, 100%, 50%)); }
  66% { filter: drop-shadow(0 0 2px hsl(0, 0%, 100%)); }
  83% { filter: drop-shadow(0 0 7px hsl(300, 100%, 50%)); }
  100% { filter: drop-shadow(0 0 2px hsl(360, 100%, 50%)); }
}

.logo-title {
  animation: rainbow-pulse 10s infinite linear;
}
</style>