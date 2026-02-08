// Service Worker for Bus-Connect - Push Notifications & Offline Support
const CACHE_VERSION = 4;
const STATIC_CACHE = `bus-connect-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bus-connect-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `bus-connect-api-v${CACHE_VERSION}`;
const MAP_TILE_CACHE = `bus-connect-tiles-v${CACHE_VERSION}`;

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
];

// API endpoints to cache for offline access
const CACHEABLE_API_ROUTES = [
  '/api/routes',
  '/api/bus-stops',
];

// Map tile URL patterns to cache
const MAP_TILE_PATTERNS = [
  /^https:\/\/[a-c]\.tile\.openstreetmap\.org\//,
];

// Maximum items in dynamic caches
const MAX_DYNAMIC_ITEMS = 50;
const MAX_MAP_TILES = 200;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, MAP_TILE_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('bus-connect-') && !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'Bus-Connect',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'bus-connect-notification',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'bus-connect-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: data.type === 'delay' || data.type === 'arrival',
    actions: getActionsForType(data.type),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Helper function to get notification actions based on type
function getActionsForType(type) {
  switch (type) {
    case 'arrival':
      return [
        { action: 'view', title: 'View on Map' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'delay':
      return [
        { action: 'details', title: 'View Details' },
        { action: 'dismiss', title: 'OK' }
      ];
    case 'congestion':
      return [
        { action: 'alternatives', title: 'See Alternatives' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    default:
      return [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Handle different actions
  switch (event.action) {
    case 'view':
    case 'details':
      if (data.scheduleId) {
        url = `/my-rides?schedule=${data.scheduleId}`;
      }
      break;
    case 'alternatives':
      url = '/routes';
      break;
    case 'dismiss':
      return;
    default:
      url = data.url || '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if app not open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('[SW] Notifications synced');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Fetch event - sophisticated offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip auth API endpoints - these should never be cached
  if (url.pathname.startsWith('/api/auth/')) {
    return; // Let the browser handle auth requests directly
  }

  // Skip Vite dev server requests (development mode)
  if (url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('.tsx') ||
    url.pathname.includes('.ts') ||
    url.pathname.includes('?v=') ||
    url.search.includes('import') ||
    url.port === '24678' ||
    url.port === '5000' && url.pathname.includes('@')) {
    return; // Let the browser handle these requests
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Handle different request types
  if (isCacheableApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
  } else if (isMapTileRequest(url)) {
    event.respondWith(cacheFirstWithNetwork(request, MAP_TILE_CACHE, MAX_MAP_TILES));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// Check if request is a cacheable API endpoint
function isCacheableApiRequest(url) {
  return CACHEABLE_API_ROUTES.some(route => url.pathname === route || url.pathname.startsWith(route + '/'));
}

// Check if request is a map tile
function isMapTileRequest(url) {
  return MAP_TILE_PATTERNS.some(pattern => pattern.test(url.href));
}

// Check if request is a static asset
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed for static asset:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first with cache fallback (for API requests)
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      // Add header to indicate offline data
      const headers = new Headers(cached.headers);
      headers.set('X-Offline-Data', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache-first with network fallback (for map tiles)
async function cacheFirstWithNetwork(request, cacheName, maxItems) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await limitCacheSize(cache, maxItems);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Map tile fetch failed:', request.url);
    // Return a placeholder or transparent tile
    return new Response('', { status: 404 });
  }
}

// Network-first with offline fallback for navigation
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, serving cached app shell');
    const cached = await caches.match('/');
    if (cached) return cached;
    return new Response('Offline - Please connect to the internet', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Stale-while-revalidate (for dynamic content)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  const response = cached || await fetchPromise;
  return response || new Response('Offline', { status: 503 });
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}
