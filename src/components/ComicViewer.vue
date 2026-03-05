<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ComicData {
  day: string;
  title: string;
  variants: {
    a: {
      model: string;
      imageUrl: string;
      votes: number;
      script: string;
    };
    b: {
      model: string;
      imageUrl: string;
      votes: number;
      script: string;
    };
  };
}

const comic = ref<ComicData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const voted = ref<string | null>(null);
const props = defineProps<{
  day?: string;
}>();
const emit = defineEmits<{
  (e: 'request-tab', tabId: string): void;
}>();

onMounted(async () => {
  await fetchToday();
});

async function fetchToday() {
  try {
    loading.value = true;
    const endpoint = props.day
      ? `/api/day?day=${encodeURIComponent(props.day)}`
      : '/api/today';
    const response = await fetch(endpoint);

    if (!response.ok) {
      if (isLocalDev()) {
        comic.value = buildLocalMockComic(props.day);
        error.value = null;
        return;
      }
      if (response.status === 404) {
        error.value = 'No comic available yet today. Check back later!';
      } else {
        throw new Error('Failed to load comic');
      }
      return;
    }

    comic.value = await response.json();
  } catch (err: any) {
    if (isLocalDev()) {
      comic.value = buildLocalMockComic(props.day);
      error.value = null;
      return;
    }
    error.value = err.message || 'Failed to load comic';
  } finally {
    loading.value = false;
  }
}

async function vote(variant: 'a' | 'b') {
  if (!comic.value || voted.value) return;

  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day: comic.value.day,
        variant
      })
    });

    if (!response.ok) throw new Error('Vote failed');

    const result = await response.json();
    voted.value = variant;

    // Update vote counts
    if (comic.value && result.votes) {
      comic.value.variants.a.votes = result.votes.a;
      comic.value.variants.b.votes = result.votes.b;
    }
  } catch (err: any) {
    if (isLocalDev() && comic.value) {
      voted.value = variant;
      comic.value.variants[variant].votes += 1;
      return;
    }
    console.error('Vote error:', err);
    alert('Failed to record vote. Please try again.');
  }
}

function isLocalDev() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function buildLocalMockComic(day?: string): ComicData {
  const date = day || new Date().toISOString().split('T')[0];
  return {
    day: date,
    title: 'Local Mock: Prompt Engineering',
    variants: {
      a: {
        model: '@local/mock-model-a',
        imageUrl: buildMockSvgDataUrl([
          'Human: "Explain Kubernetes simply."',
          'Robot> confidence: 0.41',
          'Robot: "Containers with orchestration."',
          'Simon: "Close enough."'
        ]),
        votes: 0,
        script: 'local mock variant a'
      },
      b: {
        model: '@local/mock-model-b',
        imageUrl: buildMockSvgDataUrl([
          'Human: "How does DNS work?"',
          'Robot> tokenizing panic',
          'Robot: "Like phonebooks, but cursed."',
          'Simon: "Accurate."'
        ]),
        votes: 0,
        script: 'local mock variant b'
      }
    }
  };
}

function buildMockSvgDataUrl(lines: string[]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420">
    <rect width="100%" height="100%" fill="white" stroke="black"/>
    <text x="24" y="44" font-size="22" font-family="Courier New, monospace">LLM DOES NOT COMPUTE (Local)</text>
    ${lines.map((line, index) =>
      `<text x="24" y="${95 + index * 70}" font-size="20" font-family="Courier New, monospace">${escapeXml(line)}</text>`
    ).join('')}
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
</script>

<template>
  <div class="comic-viewer">
    <div v-if="loading" class="loading">
      <p>⏳ Loading today's comic...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchToday">Retry</button>
    </div>

    <div v-else-if="comic" class="comic-display">
      <h2 class="comic-title">{{ comic.title }}</h2>
      <p class="comic-date">{{ comic.day }}</p>

      <div class="variants">
        <!-- Variant A -->
        <div class="variant">
          <div class="variant-header">
            <h3>Variant A</h3>
            <span class="model-tag">{{ comic.variants.a.model.split('/').pop() }}</span>
          </div>

          <div class="image-container">
            <img :src="comic.variants.a.imageUrl" alt="Comic Variant A" />
          </div>

          <div class="vote-section">
            <button
              class="vote-btn"
              :disabled="!!voted"
              :class="{ selected: voted === 'a' }"
              @click="vote('a')"
            >
              {{ voted === 'a' ? '✓ Voted' : 'Vote A' }}
            </button>
            <span class="vote-count">{{ comic.variants.a.votes }} votes</span>
          </div>
        </div>

        <!-- Variant B -->
        <div class="variant">
          <div class="variant-header">
            <h3>Variant B</h3>
            <span class="model-tag">{{ comic.variants.b.model.split('/').pop() }}</span>
          </div>

          <div class="image-container">
            <img :src="comic.variants.b.imageUrl" alt="Comic Variant B" />
          </div>

          <div class="vote-section">
            <button
              class="vote-btn"
              :disabled="!!voted"
              :class="{ selected: voted === 'b' }"
              @click="vote('b')"
            >
              {{ voted === 'b' ? '✓ Voted' : 'Vote B' }}
            </button>
            <span class="vote-count">{{ comic.variants.b.votes }} votes</span>
          </div>
        </div>
      </div>

      <div v-if="voted" class="thank-you">
        <p>✅ Thank you for voting! Come back tomorrow for the next comic.</p>
      </div>

      <div class="instructions">
        <p>🗳️ <strong>Vote for your favorite!</strong> Two AI models generated these comics from the same prompt.</p>
        <p>🔔 <a href="#" @click.prevent="emit('request-tab', 'subscribe')">Subscribe</a> to get notified when new comics are published.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comic-viewer {
  font-family: 'MS Sans Serif', Arial, sans-serif;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  font-size: 14px;
}

.error button {
  margin-top: 16px;
  padding: 6px 16px;
  border: 2px outset #dfdfdf;
  background: #c0c0c0;
  cursor: pointer;
}

.comic-title {
  font-size: 18px;
  margin: 0 0 4px 0;
  font-weight: bold;
}

.comic-date {
  color: #666;
  font-size: 12px;
  margin: 0 0 20px 0;
}

.variants {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 900px) {
  .variants {
    grid-template-columns: 1fr;
  }
}

.variant {
  border: 2px solid #808080;
  padding: 12px;
  background: white;
}

.variant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.variant-header h3 {
  font-size: 14px;
  margin: 0;
}

.model-tag {
  font-size: 11px;
  background: #000080;
  color: white;
  padding: 2px 8px;
  border-radius: 2px;
}

.image-container {
  background: white;
  border: 1px solid #ccc;
  margin-bottom: 12px;
  text-align: center;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container img {
  max-width: 100%;
  height: auto;
}

.vote-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vote-btn {
  padding: 8px 24px;
  border: 2px outset #dfdfdf;
  background: #c0c0c0;
  cursor: pointer;
  font-weight: bold;
  font-size: 13px;
}

.vote-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.vote-btn:active:not(:disabled) {
  border-style: inset;
}

.vote-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vote-btn.selected {
  background: #000080;
  color: white;
}

.vote-count {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.thank-you {
  background: #ffffcc;
  border: 2px solid #808080;
  padding: 12px;
  margin-bottom: 16px;
  text-align: center;
}

.instructions {
  background: #f0f0f0;
  border: 2px inset #dfdfdf;
  padding: 12px;
  font-size: 12px;
}

.instructions p {
  margin: 8px 0;
}

.instructions a {
  color: #000080;
  text-decoration: underline;
  cursor: pointer;
}
</style>
