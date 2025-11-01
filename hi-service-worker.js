/**
 * 🚀 Hi Platform Service Worker
 * Tesla-grade offline support and caching strategy
 */

const CACHE_NAME = 'hi-platform-v3';
const STATIC_ASSETS = [
    '/',
    '/hi-island-NEW.html',
    '/welcome.html',
    '/tesla-edge-protection.css',
    '/hi-access-tiers.js',
    '/hi-realtime-controller.js',
    '/hi-analytics-engine.js',
    '/tesla-map-performance.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});
