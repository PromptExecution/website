<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ArchiveItem {
  day: string;
  title: string;
  models: { a: string; b: string };
  votes: { a: number; b: number };
  created: string;
}

interface ArchiveResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: ArchiveItem[];
}

const archive = ref<ArchiveResponse | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const currentPage = ref(1);

onMounted(async () => {
  await fetchArchive(1);
});

async function fetchArchive(page: number) {
  try {
    loading.value = true;
    const response = await fetch(`/api/archive?page=${page}&limit=20`);

    if (!response.ok) {
      if (isLocalDev()) {
        archive.value = buildLocalArchive(page);
        error.value = null;
        currentPage.value = page;
        return;
      }
      throw new Error('Failed to load archive');
    }

    archive.value = await response.json();
    currentPage.value = page;
  } catch (err: any) {
    if (isLocalDev()) {
      archive.value = buildLocalArchive(page);
      error.value = null;
      currentPage.value = page;
      return;
    }
    error.value = err.message || 'Failed to load archive';
  } finally {
    loading.value = false;
  }
}

function getWinner(item: ArchiveItem): string {
  if (item.votes.a > item.votes.b) return 'A';
  if (item.votes.b > item.votes.a) return 'B';
  return 'Tie';
}

function isLocalDev() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function buildLocalArchive(page: number): ArchiveResponse {
  const today = new Date().toISOString().split('T')[0];
  return {
    page,
    limit: 20,
    total: 1,
    totalPages: 1,
    items: [
      {
        day: today,
        title: 'Local Mock: Prompt Engineering',
        models: { a: '@local/mock-model-a', b: '@local/mock-model-b' },
        votes: { a: 0, b: 0 },
        created: new Date().toISOString()
      }
    ]
  };
}
</script>

<template>
  <div class="comic-archive">
    <h2>Comic Archive</h2>

    <div v-if="loading" class="loading">
      <p>⏳ Loading archive...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchArchive(currentPage)">Retry</button>
    </div>

    <div v-else-if="archive" class="archive-content">
      <p class="archive-info">
        Showing {{ archive.items.length }} of {{ archive.total }} comics
      </p>

      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Models</th>
            <th>Votes (A / B)</th>
            <th>Winner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in archive.items" :key="item.day">
            <td>{{ item.day }}</td>
            <td class="title-cell">{{ item.title }}</td>
            <td class="models-cell">
              <div>A: {{ item.models.a.split('/').pop() }}</div>
              <div>B: {{ item.models.b.split('/').pop() }}</div>
            </td>
            <td class="votes-cell">
              {{ item.votes.a }} / {{ item.votes.b }}
            </td>
            <td class="winner-cell" :class="{ winner: getWinner(item) !== 'Tie' }">
              {{ getWinner(item) }}
            </td>
            <td>
              <a :href="`/?tab=comic&day=${item.day}`" target="_blank" class="view-link">View</a>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button
          :disabled="currentPage === 1"
          @click="fetchArchive(currentPage - 1)"
          class="page-btn"
        >
          ◀ Previous
        </button>

        <span class="page-info">
          Page {{ archive.page }} of {{ archive.totalPages }}
        </span>

        <button
          :disabled="currentPage === archive.totalPages"
          @click="fetchArchive(currentPage + 1)"
          class="page-btn"
        >
          Next ▶
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comic-archive {
  font-family: 'MS Sans Serif', Arial, sans-serif;
}

h2 {
  font-size: 16px;
  margin: 0 0 16px 0;
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

.archive-info {
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
}

.archive-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 2px solid #808080;
  font-size: 12px;
}

.archive-table th,
.archive-table td {
  padding: 8px;
  border: 1px solid #c0c0c0;
  text-align: left;
}

.archive-table th {
  background: #c0c0c0;
  font-weight: bold;
  border: 2px outset #dfdfdf;
}

.archive-table tr:hover {
  background: #e0e0e0;
}

.title-cell {
  font-weight: bold;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.models-cell {
  font-size: 10px;
  color: #666;
}

.models-cell div {
  margin: 2px 0;
}

.votes-cell {
  text-align: center;
  font-weight: bold;
}

.winner-cell {
  text-align: center;
  font-weight: bold;
}

.winner-cell.winner {
  color: #008000;
}

.view-link {
  color: #000080;
  text-decoration: underline;
  cursor: pointer;
}

.view-link:hover {
  color: #ff0000;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

.page-btn {
  padding: 6px 16px;
  border: 2px outset #dfdfdf;
  background: #c0c0c0;
  cursor: pointer;
  font-weight: bold;
}

.page-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.page-btn:active:not(:disabled) {
  border-style: inset;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  font-weight: bold;
}
</style>
