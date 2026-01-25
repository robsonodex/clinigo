/**
 * CliniGo Service Worker
 * Provides offline support and caching for PWA functionality
 */

const CACHE_NAME = 'clinigo-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    '/logo.png',
    '/logo_black.svg',
    '/logo_white.svg',
    '/manifest.webmanifest',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching assets');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip API requests (don't cache)
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Skip Chrome extensions and other non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response for caching
                const responseClone = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }

                return response;
            })
            .catch(async () => {
                // Try to get from cache
                const cachedResponse = await caches.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                // If it's a navigation request, show offline page
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }

                // Return empty response for other requests
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            })
    );
});

// Handle push notifications (future use)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    event.waitUntil(
        self.registration.showNotification(data.title || 'CliniGo', {
            body: data.body || '',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: data.tag || 'clinigo-notification',
        })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.openWindow(event.notification.data?.url || '/')
    );
});
