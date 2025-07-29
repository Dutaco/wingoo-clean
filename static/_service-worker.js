const cacheName = 'wingoo-cache-v1';
const assets = [
  '/',
  '/static/styles/bootstrap.css',
  '/static/styles/style.css',
  '/static/fonts/css/fontawesome-all.min.css',
  '/app/icons/icon-192x192.png',
  '/index.html'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request);
    })
  );
});
