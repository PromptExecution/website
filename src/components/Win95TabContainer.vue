<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ComicViewer from './ComicViewer.vue';
import ComicArchive from './ComicArchive.vue';
import PushSubscribe from './PushSubscribe.vue';
import TheXTerm from './TheXTerm.vue';

const activeTab = ref('comic');
const selectedDay = ref<string | undefined>(undefined);

const tabs = [
  { id: 'comic', label: 'Comic' },
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
  if (day) {
    selectedDay.value = day;
    activeTab.value = 'comic';
  }
});
</script>

<template>
  <div class="win95-window">
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
          v-if="activeTab === 'comic'"
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
</template>

<style scoped>
/* Win95-style custom styling */
.win95-window {
  max-width: 1400px;
  margin: 20px auto;
  border: 2px solid #dfdfdf;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  background: #c0c0c0;
  font-family: 'MS Sans Serif', Arial, sans-serif;
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
  background: #c0c0c0;
}

.tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 2px;
  border-bottom: 2px solid #808080;
}

.tab {
  padding: 6px 16px;
  background: #c0c0c0;
  border: 2px solid #dfdfdf;
  border-bottom: none;
  cursor: pointer;
  font-family: 'MS Sans Serif', Arial, sans-serif;
  font-size: 12px;
  position: relative;
  top: 2px;
}

.tab:hover {
  background: #e0e0e0;
}

.tab.active {
  background: #c0c0c0;
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #808080;
  font-weight: bold;
  z-index: 1;
}

.tab-content {
  min-height: 500px;
  padding: 16px;
  background: #c0c0c0;
  border: 2px inset #dfdfdf;
}

.status-bar {
  display: flex;
  gap: 2px;
  margin-top: 8px;
  font-size: 11px;
}

.status-bar-field {
  padding: 4px 8px;
  border: 1px inset #dfdfdf;
  background: #c0c0c0;
  flex: 1;
  margin: 0;
}
</style>
