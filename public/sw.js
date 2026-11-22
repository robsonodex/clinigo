/**
 * CliniGo Service Worker - CLEANUP & NETWORK-ONLY MODE (v2)
 * Purges stale app shell and legacy icon caches (including Workbox static-images)
 * so Android/iOS PWAs immediately pick up updated manifests and brand assets.
 */

const CACHE_NAME = 'clinigo-cleanup-v2';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(cacheNames.map((name) => caches.delete(name)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
        event.waitUntil(
            caches
                .keys()
                .then((cacheNames) =>
                    Promise.all(cacheNames.map((name) => caches.delete(name)))
                )
        );
    }
});

// Network-only passthrough (prevents stale HTML/icon cache)
self.addEventListener('fetch', () => {
    return;
});
