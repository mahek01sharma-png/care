const CACHE_NAME = 'zengarden-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    'https://via.placeholder.com/192/d4e9d4/ffffff?text=Z'
];

// 1. Install Event: Caching the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('ZenGarden: Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Activate Event: Cleaning up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('ZenGarden: Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Fetch Event: Serving content from cache when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return the cached file if found, otherwise try the network
            return response || fetch(event.request);
        })
    );
});
