const CACHE_NAME = 'edulink-cache-v2';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-512x512.png',
    '/offline.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Network First Strategy for API and dynamic pages
    if (request.mode === 'navigate' || url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request).then((response) => {
                        if (response) return response;
                        if (request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
                })
        );
        return;
    }

    // Cache First Strategy for static assets
    event.respondWith(
        caches.match(request).then((response) => {
            return response || fetch(request).then((fetchResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    // Only cache successful GET requests
                    if (request.method === 'GET' && fetchResponse.status === 200) {
                        cache.put(request, fetchResponse.clone());
                    }
                    return fetchResponse;
                });
            });
        })
    );
});

