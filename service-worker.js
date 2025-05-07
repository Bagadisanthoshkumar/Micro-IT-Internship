const CACHE_NAME = 'india-weather-app-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/weather.html',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];
const API_CACHE_NAME = 'weather-api-cache-v1';

// Install event: Cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event: Serve cached assets or fetch from network
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Handle API requests
    if (url.origin === 'https://api.openweathermap.org') {
        event.respondWith(
            caches.open(API_CACHE_NAME).then(cache => {
                return fetch(event.request).then(networkResponse => {
                    // Cache the API response
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Return cached API response if offline
                    return caches.match(event.request).then(cachedResponse => {
                        return cachedResponse || new Response(JSON.stringify({
                            cod: 'offline',
                            message: 'You are offline. Showing cached data or try again later.'
                        }), {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                });
            })
        );
    } else {
        // Handle static assets
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(networkResponse => {
                    // Cache new assets dynamically
                    if (event.request.method === 'GET') {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                });
            }).catch(() => {
                // Fallback for offline HTML
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
                return new Response('Offline: Resource not available', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
        );
    }
});