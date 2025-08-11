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
                <img src="/title-promptexecution.svg" class="logo-title" alt="Prompt Execution"/>
                <img src="/subtitle-cognitive-process-automation.svg" class="logo-subtitle" alt="Cognitive Robotic Process Automation"/>
            </div>
        </div>
    </div>
</template>

<style scoped>

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
    width: 696px;
    height: 60px;
    padding: 0 4px;
    border-radius: 5px;
}

.logo-subtitle {
    width: 696px;
    height: 30px;
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