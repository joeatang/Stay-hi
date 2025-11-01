// 🚀 TESLA-GRADE SERVICE WORKER
// Hi Collective PWA - Offline-first architecture

const CACHE_NAME = 'hi-collective-v1.0.0';
const STATIC_CACHE_NAME = 'hi-static-v1.0.0';

// Core app shell files that should always be cached
const APP_SHELL_FILES = [
  '/',
  '/welcome.html',
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
  
  // External dependencies
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Dynamic content that should be cached but can be stale
const DYNAMIC_CACHE_FILES = [
  // User profiles and data will be cached dynamically
];

// Install event - cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell files
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Caching app shell files');
        return cache.addAll(APP_SHELL_FILES);
      }),
      
      // Cache dynamic content
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Dynamic cache opened');
        return cache.addAll(DYNAMIC_CACHE_FILES);
      })
    ])
  );
  
  // Force activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
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
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - Tesla-grade caching strategy without redirect conflicts
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // 🚀 TESLA-GRADE FIX: Skip ALL navigation requests to avoid redirect conflicts
  // This prevents "Response served by service worker has redirections" on mobile Safari
  if (request.destination === 'document' || request.mode === 'navigate') {
    console.log('[SW] Bypassing navigation request to prevent redirect conflicts:', url.pathname);
    return; // Let browser handle navigation naturally - no event.respondWith()
  }
  
  // Skip cross-origin requests (except Supabase CDN)  
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase')) {
    return;
  }
  
  // Skip Supabase API calls (always need fresh data)
  if (url.hostname.includes('supabase.co')) {
    return;
  }
  
  // Only handle static assets (CSS, JS, images) - never HTML pages
  if (url.pathname.includes('/assets/') || 
      url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff|woff2)$/)) {
    event.respondWith(cacheFirst(request));
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
      const offlinePage = await caches.match('/welcome.html');
      return offlinePage || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
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
      const offlinePage = await caches.match('/welcome.html');
      return offlinePage || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
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
});