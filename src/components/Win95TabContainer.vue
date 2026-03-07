<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from 'vue';

const SHOW_COMIC_ENGINE = false;

const ComicViewer = defineAsyncComponent(() => import('./ComicViewer.vue'));
const ComicArchive = defineAsyncComponent(() => import('./ComicArchive.vue'));
const PushSubscribe = defineAsyncComponent(() => import('./PushSubscribe.vue'));
const TheXTerm = defineAsyncComponent(() => import('./TheXTerm.vue'));

const defaultTab = SHOW_COMIC_ENGINE ? 'comic' : 'archive';
const activeTab = ref(defaultTab);
const selectedDay = ref<string | undefined>(undefined);

const tabs = [
  ...(SHOW_COMIC_ENGINE ? [{ id: 'comic', label: 'Comic' }] : []),
  { id: 'archive', label: 'Archive' },
  { id: 'subscribe', label: 'Subscribe' },
  { id: 'cli', label: 'CLI' }
];

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const day = params.get('day');

  if (tab && tabs.some(t => t.id === tab)) {
    activeTab.value = tab;
  }
  if (SHOW_COMIC_ENGINE && day) {
    selectedDay.value = day;
    activeTab.value = 'comic';
  }
});
</script>

<template>
  <div v-if="SHOW_COMIC_ENGINE" class="window comic-window">
    <div class="title-bar">
      <div class="title-bar-text">LLM DOES NOT COMPUTE - promptexecution.com</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize"></button>
        <button aria-label="Maximize"></button>
        <button aria-label="Close"></button>
      </div>
    </div>

    <div class="window-body">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <ComicViewer
          v-if="SHOW_COMIC_ENGINE && activeTab === 'comic'"
          :day="selectedDay"
          @request-tab="activeTab = $event"
        />
        <ComicArchive v-if="activeTab === 'archive'" />
        <PushSubscribe v-if="activeTab === 'subscribe'" />
        <TheXTerm v-if="activeTab === 'cli'" />
      </div>

      <div class="status-bar">
        <p class="status-bar-field">Sponsored by Cloudflare ☁️</p>
        <p class="status-bar-field">
          Powered by Workers AI + R2 + D1 + Pages
        </p>
      </div>
    </div>
  </div>
  <div v-else class="cli-only-container">
    <TheXTerm />
  </div>
</template>

<style scoped>
.comic-window {
  max-width: 1400px;
  margin: 12px auto 24px;
  min-height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  font-family: Tahoma, 'Trebuchet MS', Verdana, Arial, sans-serif;
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, #000080, #1084d0);
  padding: 4px 4px 4px 8px;
  color: white;
  font-weight: bold;
  font-size: 13px;
}

.title-bar-controls {
  display: flex;
  gap: 2px;
}

.title-bar-controls button {
  width: 20px;
  height: 18px;
  border: 1px outset #dfdfdf;
  background: #c0c0c0;
  cursor: pointer;
  font-size: 10px;
}

.title-bar-controls button:active {
  border-style: inset;
}

.window-body {
  padding: 8px;
  background: #ece9d8;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 2px;
  border-bottom: 1px solid #7f9db9;
}

.tab {
  padding: 6px 16px;
  background: #ece9d8;
  border: 1px solid #7f9db9;
  border-bottom: none;
  cursor: pointer;
  font-family: Tahoma, 'Trebuchet MS', Verdana, Arial, sans-serif;
  font-size: 12px;
  position: relative;
  top: 1px;
}

.tab:hover {
  background: #f5f3ea;
}

.tab.active {
  background: #ffffff;
  border-top: 1px solid #3d84c6;
  border-left: 1px solid #3d84c6;
  border-right: 1px solid #3d84c6;
  font-weight: bold;
  z-index: 1;
}

.tab-content {
  min-height: 500px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #7f9db9;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status-bar {
  display: flex;
  gap: 2px;
  margin-top: 8px;
  font-size: 11px;
}

.status-bar-field {
  padding: 4px 8px;
  border: 1px solid #b9b6aa;
  background: #ece9d8;
  flex: 1;
  margin: 0;
}

.cli-only-container {
  max-width: 1400px;
  margin: 2px auto 24px;
}

@media (max-width: 767px) {
  .comic-window {
    margin: 8px auto 16px;
    min-height: calc(100dvh - 64px);
  }

  .tab-content {
    min-height: 420px;
    padding: 12px;
  }

  .status-bar {
    flex-direction: column;
  }

  .cli-only-container {
    margin: 4px auto 16px;
  }
}
</style>
