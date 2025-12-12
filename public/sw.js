// Service Worker for Ritual PWA
const CACHE_NAME = 'ritual-critical-v1';

// Critical assets to precache for instant loading
const CRITICAL_ASSETS = [
  '/ritual-logo-full.png',
  '/ritual-poster.jpg',
  '/ritual-icon.png',
  '/favicon.png'
];

// Install: Precache critical assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name.startsWith('ritual-') && name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first for critical assets
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  
  // Cache-first for critical assets
  var isCritical = CRITICAL_ASSETS.some(function(asset) { return url.pathname === asset; });
  if (isCritical) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// Handle push notifications
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  
  var options = {
    body: data.body || 'You have a new notification',
    icon: '/ritual-icon.png',
    badge: '/ritual-icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      type: data.type
    },
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ritual', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  var url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
