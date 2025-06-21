// TALK2Me Service Worker - Sesja 17 (21.06.2025)
// Implementuje network-first strategy - bez cache'owania dla development
// v1.5 - wyłączony cache dla lepszej widoczności zmian po deploy
const CACHE_NAME = 'talk2me-v1.5-no-cache';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/admin.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - minimal caching (only PWA essentials)
self.addEventListener('install', function(event) {
  console.log('SW: Installing v1.5 (no-cache strategy)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('SW: Caching only PWA essentials');
        // Cache tylko manifest i ikony dla PWA
        return cache.addAll([
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ]);
      })
      .then(function() {
        console.log('SW: Cleaning all old caches...');
        return caches.keys();
      })
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .catch(function(error) {
        console.error('SW: Installation failed:', error);
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

// Fetch event - NETWORK FIRST strategy (no caching for development)
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    // NETWORK FIRST - zawsze próbuj network, cache tylko jako fallback
    fetch(event.request)
      .then(function(response) {
        console.log('SW: Fetched from network (fresh):', event.request.url);
        
        // Opcjonalnie cache tylko manifest i ikony dla podstawowej PWA funkcjonalności
        if (event.request.url.includes('/manifest.json') || 
            event.request.url.includes('/icons/')) {
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(function() {
        // Fallback do cache tylko gdy network nie działa (offline)
        console.log('SW: Network failed, trying cache for:', event.request.url);
        return caches.match(event.request)
          .then(function(response) {
            if (response) {
              console.log('SW: Serving from cache (offline fallback):', event.request.url);
              return response;
            }
            
            // Ostateczny fallback dla navigation - main page
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Nie ma cache - zwróć błąd
            throw new Error('No cache available');
          });
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