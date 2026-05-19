self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Only intercept http/https GET requests to avoid errors on non-network requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 503 }))
  );
});
