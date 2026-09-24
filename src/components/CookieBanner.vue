<!-- CookieBanner.vue -->
<template>
  <div class="cookie-banner">
    <!-- Cookie banner content -->
    🍪 Do you want milk with your cookies?
    <button @click="handleConsent" class="accept-button">Accept Cookies</button>
    <button @click="handleReject" class="reject-button">Reject Cookies</button>

</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useMainStore } from '@/store/mainStore';
import { useState } from 'vue-gtag-next';

export default defineComponent({
  setup() {
    const mainStore = useMainStore();
    const { isEnabled } = useState();

    const handleConsent = () => {
      mainStore.setCookieConsent('accepted');
      if (isEnabled) {
        isEnabled.value = true; // Enable tracking
      }
    };

    const handleReject = () => {
      mainStore.setCookieConsent('rejected');
      if (isEnabled) {
        isEnabled.value = false; // Disable tracking
      }
    };

    return { handleConsent, handleReject };
  }
});
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #222;
  color: #f0f0f0;
  padding: 14px 20px;
  box-shadow: 0px -2px 12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.5s ease-out;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 14px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

  /* Artistic Border */
  border: 2px solid #555;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.accept-button {
  background-color: #2e7d32;
  color: #fff;
  border: none;
  padding: 10px 24px;
  margin: 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.reject-button {
  background-color: transparent;
  color: #ccc;
  border: 1px solid #666;
  padding: 10px 24px;
  margin: 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.15s;
}

/* Optional: Add hover effects */
.accept-button:hover {
  background-color: #1b5e20;
}

.reject-button:hover {
  background-color: #444;
  color: #fff;
  border-color: #888;
}
</style>
