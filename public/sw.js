self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Un Service Worker básico para satisfacer los requisitos PWA de Chrome.
  // No hace caching complejo para evitar problemas con la DB en tiempo real.
});
