/**
 * CliniGo Service Worker - SELF DESTRUCT MODE
 * This version forces cache clearing to fix stale app shell issues.
 */

const CACHE_NAME = 'clinigo-cleanup-v1';

// Install event - skip waiting immediately
self.addEventListener('install', (event) => {
    console.log('[SW-CLEANUP] Installing cleanup worker...');
    self.skipWaiting();
});

// Activate event - DELETE ALL CACHES and claim clients
self.addEventListener('activate', (event) => {
    console.log('[SW-CLEANUP] Activating and clearing caches...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    console.log('[SW-CLEANUP] Deleting cache:', name);
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - NETWORK ONLY (No Cache)
self.addEventListener('fetch', (event) => {
    // Pass through to network
    return;
});

