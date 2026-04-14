const CACHE_NAME = 'zengarden-cache-v2';
const urlsToCache = [
    '/',
    '/care',
    '/care/index.html',
    '/care/script.js',
    '/care/style.css',
    '/care/manifest.json'
    // Add icons if you have them:
    '/care/icon-192.png',
    '/care/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('ZenGarden: Caching app files');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                // Otherwise fetch from network
                return fetch(event.request);
            })
            .catch(() => {
                // Optional: Return a fallback page if offline
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
