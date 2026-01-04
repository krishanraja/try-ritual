// Service Worker for Ritual PWA - Fixed Caching Strategy
// CRITICAL FIX: Network-first for ALL API calls to prevent stale data issues
// Version includes timestamp to force cache bust on each deploy
const CACHE_VERSION = 'v4-' + '20260104'; // Update on each deploy
const BUILD_ID = '2026-01-04-multiplayer-fix'; // Semantic build ID for version checking
const CRITICAL_CACHE = 'ritual-critical-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'ritual-dynamic-' + CACHE_VERSION;

// Critical assets to precache for instant loading (static assets only)
const CRITICAL_ASSETS = [
  '/ritual-logo-full.png',
  '/ritual-poster.jpg',
  '/ritual-icon.png',
  '/favicon.png'
];

// Install: Precache critical assets and force immediate activation
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CRITICAL_CACHE).then(function(cache) {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
  // Force immediate activation - don't wait for existing clients to close
  self.skipWaiting();
});

// Activate: Clean up ALL old caches and take control immediately
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { 
            // Delete any ritual cache that doesn't match current version
            return name.startsWith('ritual-') && 
                   name !== CRITICAL_CACHE && 
                   name !== DYNAMIC_CACHE; 
          })
          .map(function(name) { 
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name); 
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch: Smart caching strategy with NETWORK-FIRST for all API calls
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  
  // CRITICAL: Network-first for ALL Supabase/API calls - NEVER serve stale API data
  // This prevents the infinite loading bug caused by cached auth/data responses
  if (url.pathname.includes('/rest/') || 
      url.pathname.includes('/auth/') || 
      url.pathname.includes('/functions/') ||
      url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Only cache successful GET requests (not auth mutations)
          if (response.ok && event.request.method === 'GET') {
            var responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function(error) {
          console.warn('[SW] Network request failed, trying cache:', url.pathname);
          // Only fall back to cache for GET requests and only if offline
          if (event.request.method === 'GET') {
            return caches.match(event.request).then(function(cached) {
              if (cached) {
                console.log('[SW] Serving cached response for:', url.pathname);
                return cached;
              }
              throw error;
            });
          }
          throw error;
        })
    );
    return;
  }
  
  // Cache-first for critical static assets (images, logos)
  var isCritical = CRITICAL_ASSETS.some(function(asset) { 
    return url.pathname === asset; 
  });
  
  if (isCritical) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(CRITICAL_CACHE).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Cache video on first play (lazy cache for performance)
  if (url.pathname.includes('ritual-background') && url.pathname.includes('.mp4')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Network-first for JS/CSS bundles (always fresh code)
  if (url.pathname.includes('/assets/') && 
      (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response.ok) {
          var responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // Network-first for index.html to ensure latest app version
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response.ok) {
          var responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
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

// Message handler for cache operations and version checking
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Received clear cache request');
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(name) {
            console.log('[SW] Clearing cache:', name);
            return caches.delete(name);
          })
        );
      }).then(function() {
        console.log('[SW] All caches cleared');
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
    );
  }
  
  // Version check - app can request current SW version
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        version: CACHE_VERSION,
        buildId: BUILD_ID
      });
    }
  }
  
  // Force update - skip waiting and refresh all clients
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('[SW] Force update requested');
    self.skipWaiting();
    // Notify all clients to reload
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'RELOAD_REQUIRED', buildId: BUILD_ID });
      });
    });
  }
});
