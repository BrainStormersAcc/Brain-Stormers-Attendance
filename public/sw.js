// Brain Stormers Attendance - PWA Service Worker
const CACHE_NAME = 'brain-stormers-attendance-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Favicon.png'
];

// Perform install steps
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching initial assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Force active immediately
  self.skipWaiting();
});

// Clean up old caches during activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting obsolete cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Cache-First or Network-Fallback routing logic for app assets
self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests
  if (event.request.method !== 'GET') return;

  // Avoid intercepting chrome-extension or external analytics request protocols
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background for next reload (stale-while-revalidate pattern)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => { /* Fail silently if network offline */ });
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Check if valid response to cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Offline fallback placeholder can be returned here if needed
          });
      })
  );
});
