// Service Worker for push notifications
// Handles incoming push messages and displays notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  return self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('Push message received:', event);

  if (!event.data) {
    console.log('Push message had no payload');
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'A new comic is available!',
      icon: data.icon || '/PromptExecution-LogoV2-semi-transparent.webp',
      badge: '/PromptExecution-LogoV2-semi-transparent.webp',
      tag: 'llm-comic-daily',
      requireInteraction: false,
      data: {
        url: data.url || 'https://promptexecution.com/comic'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'LLM DOES NOT COMPUTE', options)
    );
  } catch (err) {
    console.error('Error handling push:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || 'https://promptexecution.com/comic';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
