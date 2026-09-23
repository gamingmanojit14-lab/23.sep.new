/* ============================================================
   TextilePOS — Service Worker
   Handles: Offline caching, PWA support
   ============================================================ */

const CACHE_NAME = 'textilepos-v1';
const CACHE_VERSION = 1;

/* Core assets to cache on install */
const CORE_ASSETS = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './admin.html',
  './salesman.html',
  './scanner.html',
  './payment.html',
  './portal.html',
  './common.js',
  './firebase-config.js',
  './manifest.json',
];

/* External assets (CDN) — cache when fetched */
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
];

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching core assets');
        return cache.addAll(CORE_ASSETS).catch(err => {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Removing old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Firebase real-time API calls (always need network)
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com') ||
      url.hostname.includes('firebaseinstallations.googleapis.com')) {
    return;
  }

  // Skip WebSocket
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Same-origin or CDN → cache-first with network update
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type !== 'opaque' || response.type === 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone).catch(() => {});
          });
        }
        return response;
      }).catch(err => {
        // Network failed
        if (cached) return cached;
        // For navigation requests, fall back to index.html
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw err;
      });

      return cached || fetchPromise;
    })
  );
});

/* ── Message handler (for skipWaiting from client) ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
