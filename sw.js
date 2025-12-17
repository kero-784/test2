// --- UPDATED sw.js ---

const CACHE_NAME = 'meat-stock-v4'; // Incremented version
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
  './butchery_extension.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
  // 1. IGNORE POST REQUESTS (API Calls cannot be cached)
  if (e.request.method !== 'GET') {
    return; 
  }

  // 2. IGNORE CHROME EXTENSIONS & NON-HTTP SCHEMES
  if (!e.request.url.startsWith('http')) {
    return;
  }

  // 3. Network First Strategy for GET requests
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Check if we received a valid response
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }

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
