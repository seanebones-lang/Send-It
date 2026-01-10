/**
 * Service Worker for Send-It
 * Caches GitHub API responses and static assets
 * Implements stale-while-revalidate strategy
 */

const CACHE_VERSION = 'send-it-v1';
const GITHUB_API_CACHE = 'github-api-v1';
const STATIC_CACHE = 'static-v1';

const CACHE_DURATION = {
  GITHUB_API: 60 * 60 * 1000, // 1 hour
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
      ]);
    }).then(() => {
      console.log('[SW] Static assets cached');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== GITHUB_API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GitHub API requests - cache with TTL
  if (url.hostname === 'api.github.com') {
    event.respondWith(handleGitHubAPI(request));
    return;
  }

  // Static assets - stale-while-revalidate
  if (request.method === 'GET') {
    event.respondWith(handleStaticAssets(request));
    return;
  }

  // Default - network only
  event.respondWith(fetch(request));
});

/**
 * Handle GitHub API requests with caching
 * Strategy: Cache-first with TTL, fallback to network
 */
async function handleGitHubAPI(request) {
  const cache = await caches.open(GITHUB_API_CACHE);
  const cached = await cache.match(request);

  // Check if cached response is still fresh
  if (cached) {
    const cachedTime = new Date(cached.headers.get('sw-cached-time'));
    const now = new Date();
    const age = now - cachedTime;

    if (age < CACHE_DURATION.GITHUB_API) {
      console.log('[SW] Serving GitHub API from cache:', request.url);
      return cached;
    }
  }

  // Fetch from network
  try {
    console.log('[SW] Fetching GitHub API from network:', request.url);
    const response = await fetch(request);

    // Only cache successful responses
    if (response.ok) {
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.set('sw-cached-time', new Date().toISOString());

      const cachedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers,
      });

      cache.put(request, cachedResponse);
      console.log('[SW] Cached GitHub API response:', request.url);
    }

    return response;
  } catch (error) {
    console.error('[SW] GitHub API fetch failed:', error);
    
    // Return stale cache if available
    if (cached) {
      console.log('[SW] Returning stale cache due to network error');
      return cached;
    }

    // Return error response
    return new Response(
      JSON.stringify({ error: 'Network error and no cached response available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle static assets with stale-while-revalidate
 * Strategy: Return cache immediately, update in background
 */
async function handleStaticAssets(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // Return cached response immediately
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached); // Fallback to cache on network error

  return cached || fetchPromise;
}

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

/**
 * Calculate total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

console.log('[SW] Service worker loaded');
