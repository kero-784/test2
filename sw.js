// --- FULL COMPLETE sw.js ---

const CACHE_NAME = 'meat-stock-v6'; // Version incremented to force update
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
  // Extensions
  './sales_extension.js',
  './price_generator.js',
  './butchery_extension.js',
  './financials_extension.js',
  // External Library
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// 1. Install Event: Cache all assets immediately
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force this service worker to become active immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// 3. Fetch Event: Network First Strategy
// (Try network -> if success, update cache -> if fail, use cache)
self.addEventListener('fetch', (e) => {
  // Ignore POST requests (API calls cannot be cached)
  if (e.request.method !== 'GET') {
    return;
  }

  // Ignore non-http requests (like chrome-extension://)
  if (!e.request.url.startsWith('http')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // If response is valid, clone it and update the cache
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }

        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });

        return res;
      })
      .catch(() => {
        // If network fails, try to return from cache
        return caches.match(e.request);
      })
  );
});
