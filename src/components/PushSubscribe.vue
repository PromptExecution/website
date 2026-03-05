<script setup lang="ts">
import { ref, onMounted } from 'vue';

const subscribed = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const supported = ref(true);
const vapidPublicKey = ref<string | null>(null);

onMounted(async () => {
  // Check if Push API is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    supported.value = false;
    error.value = 'Push notifications are not supported in your browser.';
    return;
  }

  await initializePushState();
});

async function subscribe() {
  if (!supported.value) return;

  try {
    loading.value = true;
    error.value = null;

    // Request notification permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      error.value = 'Notification permission denied.';
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    if (!vapidPublicKey.value) {
      throw new Error('Push is not configured for this environment yet.');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey.value)
    });

    // Send subscription to server
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON())
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    subscribed.value = true;

  } catch (err: any) {
    console.error('Subscription error:', err);
    error.value = err.message || 'Failed to subscribe';
  } finally {
    loading.value = false;
  }
}

async function unsubscribe() {
  try {
    loading.value = true;
    error.value = null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Tell server to remove subscription
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
    }

    subscribed.value = false;

  } catch (err: any) {
    console.error('Unsubscribe error:', err);
    error.value = err.message || 'Failed to unsubscribe';
  } finally {
    loading.value = false;
  }
}

async function initializePushState() {
  try {
    const response = await fetch('/api/push-key');
    if (!response.ok) {
      supported.value = false;
      error.value = 'Push keys are not configured on this environment.';
      return;
    }

    const payload = await response.json();
    vapidPublicKey.value = payload.publicKey;

    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      subscribed.value = !!subscription;
    }
  } catch (err: any) {
    supported.value = false;
    error.value = err.message || 'Failed to initialize push notifications.';
  }
}

async function sendLocalTestNotification() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await registration.showNotification('LLM DOES NOT COMPUTE (Local Test)', {
      body: 'Local notification test succeeded.',
      icon: '/PromptExecution-LogoV2-semi-transparent.webp',
      badge: '/PromptExecution-LogoV2-semi-transparent.webp',
      data: { url: `${window.location.origin}/` }
    });
  } catch (err: any) {
    error.value = err.message || 'Failed to show local test notification.';
  }
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
</script>

<template>
  <div class="push-subscribe">
    <h2>🔔 Daily Comic Notifications</h2>

    <div class="info-box">
      <p>
        <strong>Get notified when a new comic is published!</strong>
      </p>
      <p>
        Subscribe to receive a browser push notification each day when the new comic is ready.
        You can vote for your favorite variant and compare how different AI models approach the same prompt.
      </p>
    </div>

    <div v-if="!supported" class="warning-box">
      <p>⚠️ {{ error }}</p>
      <p>Please use a modern browser like Chrome, Firefox, or Edge to enable push notifications.</p>
    </div>

    <div v-else class="controls">
      <div v-if="!subscribed">
        <button
          @click="subscribe"
          :disabled="loading"
          class="action-btn subscribe-btn"
        >
          {{ loading ? 'Subscribing...' : '🔔 Subscribe to Daily Comics' }}
        </button>
        <button
          class="action-btn test-btn"
          @click="sendLocalTestNotification"
        >
          Send Local Test Notification
        </button>
      </div>

      <div v-else class="subscribed-status">
        <p class="success">✅ You're subscribed! You'll receive daily notifications.</p>
        <button
          @click="unsubscribe"
          :disabled="loading"
          class="action-btn unsubscribe-btn"
        >
          {{ loading ? 'Unsubscribing...' : 'Unsubscribe' }}
        </button>
      </div>

      <p v-if="error" class="error-message">⚠️ {{ error }}</p>
    </div>

    <div class="how-it-works">
      <h3>How it works:</h3>
      <ol>
        <li>Click "Subscribe to Daily Comics"</li>
        <li>Allow notifications when prompted</li>
        <li>Get notified daily at 9 AM UTC when a new comic is published</li>
        <li>Vote for your favorite variant (A or B)</li>
        <li>Check the archive to see past winners</li>
      </ol>
    </div>

    <div class="tech-specs">
      <h4>Tech Details:</h4>
      <ul>
        <li>Powered by <strong>Web Push API</strong></li>
        <li>Comics generated using <strong>Cloudflare Workers AI</strong></li>
        <li>Stored in <strong>Cloudflare R2</strong></li>
        <li>Metadata in <strong>Cloudflare D1</strong> (SQLite)</li>
        <li>Scheduled with <strong>Cloudflare Cron Triggers</strong></li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.push-subscribe {
  font-family: 'MS Sans Serif', Arial, sans-serif;
  max-width: 700px;
}

h2 {
  font-size: 16px;
  margin: 0 0 16px 0;
}

h3 {
  font-size: 14px;
  margin: 16px 0 8px 0;
}

h4 {
  font-size: 13px;
  margin: 12px 0 8px 0;
}

.info-box {
  background: #ffffcc;
  border: 2px solid #808080;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 13px;
}

.info-box p {
  margin: 8px 0;
}

.warning-box {
  background: #ffcccc;
  border: 2px solid #cc0000;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 13px;
}

.warning-box p {
  margin: 8px 0;
}

.controls {
  margin-bottom: 24px;
}

.action-btn {
  padding: 12px 24px;
  border: 2px outset #dfdfdf;
  background: #c0c0c0;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  width: 100%;
  max-width: 400px;
}

.action-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.action-btn:active:not(:disabled) {
  border-style: inset;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.subscribe-btn {
  background: #000080;
  color: white;
}

.unsubscribe-btn {
  margin-top: 12px;
}

.test-btn {
  margin-top: 12px;
}

.subscribed-status {
  background: #ccffcc;
  border: 2px solid #008000;
  padding: 16px;
}

.subscribed-status .success {
  font-weight: bold;
  color: #008000;
  margin: 0 0 12px 0;
}

.error-message {
  color: #cc0000;
  font-weight: bold;
  margin-top: 12px;
  font-size: 13px;
}

.how-it-works {
  background: #f0f0f0;
  border: 2px inset #dfdfdf;
  padding: 16px;
  margin-bottom: 16px;
  font-size: 12px;
}

.how-it-works ol {
  margin: 8px 0;
  padding-left: 24px;
}

.how-it-works li {
  margin: 6px 0;
}

.tech-specs {
  background: #e0e0e0;
  border: 2px inset #dfdfdf;
  padding: 16px;
  font-size: 11px;
}

.tech-specs ul {
  margin: 8px 0;
  padding-left: 24px;
  list-style: square;
}

.tech-specs li {
  margin: 4px 0;
}
</style>
