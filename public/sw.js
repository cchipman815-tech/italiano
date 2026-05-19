const CACHE_NAME = 'italiano-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-only: just satisfy Chrome's PWA installability requirement
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
