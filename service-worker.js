/**
 * SoloHabits - Service Worker
 * Handles offline caching and background sync
 */

const CACHE_NAME = 'solohabits-v1.0.0';
const STATIC_CACHE = 'solohabits-static-v1.0.0';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/utils.js',
    '/js/storage.js',
    '/js/xp.js',
    '/js/streaks.js',
    '/js/achievements.js',
    '/js/habits.js',
    '/js/notifications.js',
    '/js/ui.js',
    '/js/app.js',
    '/icons/icon-72.png',
    '/icons/icon-96.png',
    '/icons/icon-128.png',
    '/icons/icon-144.png',
    '/icons/icon-152.png',
    '/icons/icon-192.png',
    '/icons/icon-384.png',
    '/icons/icon-512.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES.map(url => {
                    return new Request(url, { cache: 'no-cache' });
                })).catch(err => {
                    console.log('[SW] Some files failed to cache:', err);
                    // Continue even if some files fail
                    return Promise.resolve();
                });
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && name !== CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // Return cached response if available
                if (cachedResponse) {
                    // Fetch fresh version in background
                    fetchAndCache(request);
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetchAndCache(request);
            })
            .catch(() => {
                // Network failed and not in cache
                // Return offline page for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                
                // Return empty response for other requests
                return new Response('', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Fetch and cache helper
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        
        // Only cache successful responses
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Try to return cached version
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Background sync for when online
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-habits') {
        // Handle habit sync if needed
        event.waitUntil(Promise.resolve());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');
    
    let data = {
        title: 'SoloHabits',
        body: 'Time to check your habits!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png'
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker loaded');
