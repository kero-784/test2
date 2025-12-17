const CACHE_NAME = 'meat-stock-v3'; // Version incremented for new extension
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './config.js',
  './state.js',
  './utils.js',
  './calculations.js',
  './renderers.js',
  './transactions.js',
  './documents.js',
  './sales_extension.js',
  './price_generator.js',
  './butchery_extension.js', // NEW FILE ADDED
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force activation immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
    // Clean up old caches
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// Network First Strategy (try network, fallback to cache)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Clone response to put in cache
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
