// 🚀 TESLA-GRADE SERVICE WORKER
// Hi Collective PWA - Offline-first architecture

// 🚀 WOZ FIX: Bump version to force cache clear on navigation regression
const BUILD_TAG = 'v1.0.5-20260107-html-sync';
// Bump cache versions to force update on deploy
const CACHE_NAME = 'hi-collective-v1.4.2-html-sync';
const STATIC_CACHE_NAME = 'hi-static-v1.4.2-html-sync';
const OFFLINE_FALLBACK = '/public/offline.html';

// 🔥 CRITICAL: Force immediate activation on mobile Chrome
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing new service worker ${BUILD_TAG} ${CACHE_NAME}`);
  event.waitUntil(self.skipWaiting()); // Don't wait for old SW to finish
});

// Core app shell files that should always be cached
const APP_SHELL_FILES = [
  '/',
  '/welcome.html',
  '/hi-dashboard.html',
  '/hi-mission-control.html',
  '/admin-self-check.html',
  OFFLINE_FALLBACK,
  '/signin.html', 
  '/signup.html',
  '/index.html',
  '/hi-island-NEW.html',
  '/hi-muscle.html',
  '/profile.html',
  '/calendar.html',
  
  // Core assets
  '/assets/theme.css',
  '/assets/create-parity.css',
  '/assets/premium-ux.css',
  '/assets/tesla-mobile-fixes.css',
  
  // Core scripts
  '/assets/supabase-init.js',
  '/assets/auth-guard.js',
  // '/assets/tesla-smooth-redirect.js', // File removed
  '/assets/tesla-instant-auth.js',
  '/assets/db.js',
  '/assets/header.js',
  
  // Brand assets
  '/assets/brand/hi-logo-light.png',
  '/assets/brand/hi-logo-dark.png',
  '/assets/brand/hi-logo-192.png',
  '/assets/brand/hi-logo-512.png',
  '/assets/brand/hi-logo-light.webp',
  '/assets/brand/hi-logo-dark.webp',
  '/assets/brand/hi-logo-192.webp',
  '/assets/brand/hi-logo-512.webp',
  '/assets/brand/hi-logo-light.avif',
  '/assets/brand/hi-logo-dark.avif',
  '/assets/brand/hi-logo-192.avif',
  '/assets/brand/hi-logo-512.avif',

  // Critical styles
  '/styles/hi-dashboard.css',

  // WOZ FIX: DO NOT cache HiSupabase.v3.js or HiFlags.js
  // These files change frequently and cause navigation breakage when stale
  // Let browser handle them with normal HTTP caching
  
  // External dependencies (UMD Supabase removed: using ESM; avoid caching remote executable code)
];

// Adjust paths when scope is /public/ so we request existing files from python server
function withScopePath(files) {
  try {
    const scope = self.registration && self.registration.scope || '';
    const underPublic = scope.endsWith('/public/');
    if (!underPublic) return files;
    const prefix = '/public';
    return files.map(p => {
      if (p === '/') return '/public/';
      if (p.startsWith('/public/')) return p;
      return prefix + p;
    });
  } catch(_) { return files; }
}

// Cache budget (defensive against uncontrolled growth)
const MAX_DYNAMIC_ENTRIES = 200;

async function enforceDynamicCacheBudget() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  if (requests.length > MAX_DYNAMIC_ENTRIES) {
    // FIFO pruning: remove oldest surplus entries
    const surplus = requests.length - MAX_DYNAMIC_ENTRIES;
    for (let i = 0; i < surplus; i++) {
      await cache.delete(requests[i]);
    }
    console.log('[SW] Pruned dynamic cache, removed', surplus, 'old entries');
  }
}

// Dynamic content that should be cached but can be stale
const DYNAMIC_CACHE_FILES = [
  // User profiles and data will be cached dynamically
];

// Install event - cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Install event', BUILD_TAG, CACHE_NAME);
  event.waitUntil((async () => {
    try {
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      console.log('[SW] Caching app shell files');
      // Best-effort caching: if any file fails, continue (prevents whole install abort)
      await Promise.all(
        withScopePath(APP_SHELL_FILES).map(async f => {
          try { await staticCache.add(f); } catch (e) { console.warn('[SW] Shell file failed:', f, e.message); }
        })
      );
      const dynCache = await caches.open(CACHE_NAME);
      await Promise.all(
        DYNAMIC_CACHE_FILES.map(async f => {
          try { await dynCache.add(f); } catch (e) { console.warn('[SW] Dynamic file failed:', f, e.message); }
        })
      );
    } catch (err) {
      console.error('[SW] Install sequence error:', err);
    }
  })());
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event', BUILD_TAG, CACHE_NAME);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Taking control immediately (no waiting)');
      return self.clients.claim(); // Take control NOW
    })
  );
});

// Fetch event - Tesla-grade caching strategy without redirect conflicts
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle navigation with network-first, fallback to offline page on failure only
  // This keeps normal redirects/browser behavior intact when online
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(handleNavigate(request));
    return;
  }
  
  // Skip cross-origin requests (except Supabase CDN)  
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase')) {
    return;
  }
  
  // Skip Supabase API calls (always need fresh data)
  if (url.hostname.includes('supabase.co')) {
    return;
  }
  
  // JS under /lib should be network-first to avoid stale logic
  if (url.pathname.startsWith('/lib/') || url.pathname.startsWith('/public/lib/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (styles, images, fonts) via stale-while-revalidate for freshness
  if (url.pathname.includes('/assets/') ||
      url.pathname.match(/\.(css|png|jpg|jpeg|svg|webp|avif|gif|woff|woff2)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// Cache-first strategy for app shell and static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first failed:', error);
    
    // Return offline fallback for navigation requests
    if (request.destination === 'document') {
      const offlinePage = await caches.match(OFFLINE_FALLBACK);
      return offlinePage || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale-While-Revalidate strategy for static assets
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(err => {
      return cached || Promise.reject(err);
    });
    return cached || fetchPromise;
  } catch (error) {
    console.warn('[SW] SWR asset error:', request.url, error);
    return caches.match(request) || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      enforceDynamicCacheBudget();
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network-first fallback to cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for navigation requests
    if (request.destination === 'document') {
      const offlinePage = await caches.match(OFFLINE_FALLBACK);
      return offlinePage || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Navigation handler: network-first, graceful offline fallback page
async function handleNavigate(request) {
  try {
    // 🎯 CRITICAL FIX: Force network-first for HTML to avoid stale cache bugs
    // Issue: Cached HTML + fresh JS = module mismatch crashes
    // Solution: Always fetch fresh HTML, bypass cache for navigation
    const resp = await fetch(request, { 
      cache: 'no-cache', // Force revalidation
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    
    // Validate response integrity
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html')) {
      console.warn('[SW] Unexpected content-type for navigational request:', ct);
      throw new Error('Invalid HTML content-type');
    }
    
    if (!resp.ok) {
      console.warn('[SW] Navigation response not OK:', resp.status);
      throw new Error(`HTTP ${resp.status}`);
    }
    
    return resp;
  } catch (err) {
    console.warn('[SW] Navigation fetch failed, trying cache:', err.message);
    
    // Try cached version as fallback (better than nothing)
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Serving cached HTML (network failed)');
      return cached;
    }
    
    // Last resort: offline page
    const offlinePage = await caches.match(OFFLINE_FALLBACK);
    return offlinePage || new Response(
      '<h1>Offline</h1><p>Could not load page. Check your connection.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'hi-sync') {
    event.waitUntil(syncHiData());
  }
});

async function syncHiData() {
  try {
    // Sync pending Hi actions when back online
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_DATA'
      });
    });
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}

// Push notifications (future feature)
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Time for your daily Hi! 🌟',
    icon: '/assets/brand/hi-logo-192.png',
    badge: '/assets/brand/hi-logo-192.png',
    tag: 'daily-hi',
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Hi Collective', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Message handling for communication with app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_UPDATED') {
    // Notify all clients that cache was updated
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_UPDATED'
        });
      });
    });
  }

  if (event.data.type === 'NUKE_CACHES') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))).then(() => {
        return self.clients.matchAll().then(clients => {
          clients.forEach(c => c.postMessage({ type: 'CACHES_CLEARED' }));
        });
      })
    );
  }

  // Avatar precache request
  if (event.data.type === 'AVATAR_PRECACHE' && event.data.avatarUrl) {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const req = new Request(event.data.avatarUrl, { mode:'no-cors' });
        const resp = await fetch(req);
        if (resp.ok || resp.type === 'opaque') {
          await cache.put(req, resp.clone());
          console.log('[SW] Cached avatar:', event.data.avatarUrl);
        } else {
          console.warn('[SW] Avatar fetch not ok:', event.data.avatarUrl, resp.status);
        }
      } catch(e){ console.warn('[SW] Avatar precache failed:', e.message); }
    })());
  }
});

// Listen for avatar-precache events from client pages via broadcast channel fallback
try {
  const channel = new BroadcastChannel('hi-avatar-precache');
  channel.onmessage = (msg) => {
    if (msg.data && msg.data.type === 'AVATAR_PRECACHE') {
      self.dispatchEvent(new MessageEvent('message', { data: msg.data }));
    }
  };
} catch(_) { /* BroadcastChannel unsupported */ }