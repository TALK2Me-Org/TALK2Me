// TALK2Me Service Worker - Sesja 14 (17.06.2025)
// Implementuje offline cache, background sync i PWA functionality
const CACHE_NAME = 'talk2me-v1.3';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/admin.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('SW: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('SW: Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version if available
        if (response) {
          console.log('SW: Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('SW: Fetching from network:', event.request.url);
        return fetch(event.request).then(function(response) {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response for caching
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(function() {
        // Fallback for offline - return main page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// Push notification support (for future)
self.addEventListener('push', function(event) {
  console.log('SW: Push received');
  // Future implementation for notifications
});

// Background sync support (for future)
self.addEventListener('sync', function(event) {
  console.log('SW: Background sync');
  // Future implementation for offline message sending
});