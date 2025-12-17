// --- FULL COMPLETE sw.js ---

const CACHE_NAME = 'meat-stock-v8'; // Version incremented
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
  './operations_extension.js',
  // External Library
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
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
  // Ignore POST requests (API calls)
  if (e.request.method !== 'GET') {
    return;
  }

  // Ignore chrome extensions
  if (!e.request.url.startsWith('http')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
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
        return caches.match(e.request);
      })
  );
});
