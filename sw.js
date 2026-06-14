const CACHE_NAME = 'faith-fast-v1.2.0-universal';
const STATIC_CACHE = 'static-v2-universal';
const DYNAMIC_CACHE = 'dynamic-v2-universal';

// URLs to cache - relative to this script's location, so the app can be
// deployed at the domain root or in a subdirectory.
const urlsToCache = [
    './',
    './index.html',
    './dashboard.html',
    './manifest.json',
    './css/style.css',
    './css/auth.css',
    './js/branding-config.js',
    './js/branding.js',
    './js/auth-helper.js',
    './js/app.js',
    './js/auth.js',
    './js/dashboard.js',
    './js/fasting.js',
    './js/journal.js',
    './js/prayers.js',
    './js/chat.js',
    './js/groups.js',
    './js/bible.js',
    './js/profile.js',
    './js/pwa.js'
];

// Install - Cross-platform optimized
self.addEventListener('install', event => {
    console.log('Service Worker: Installing (Universal)...');
    
    // Immediate activation for iOS, harmless for Android
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching core files');
                // Cache each file individually (works on both platforms)
                const cachePromises = urlsToCache.map(url => {
                    return cache.add(url).catch(error => {
                        console.log(`Failed to cache ${url}:`, error);
                    });
                });
                return Promise.all(cachePromises);
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting(); // Double ensure for iOS
            })
    );
});

// Fetch - Universal handling
self.addEventListener('fetch', event => {
    // Skip non-GET requests (both platforms)
    if (event.request.method !== 'GET') return;

    // Never cache API responses - chat messages, notifications, etc. are
    // dynamic and must always come from the network. caches.match's
    // ignoreSearch would otherwise return the same cached response for
    // every "?group_id=..." / "?user_id=..." variant of an endpoint.
    const requestUrl = new URL(event.request.url);
    if (requestUrl.pathname.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // iOS-specific: handle Safari redirects (harmless on Android)
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        return;
    }

    event.respondWith(
        caches.match(event.request, {ignoreSearch: true}) // Works on both
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // Cache the response for future use
                        const responseToCache = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.log('Fetch failed:', error);
                        // Universal offline fallback
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                        // You could return other fallbacks based on request type
                    });
            })
    );
});

// Activate - Same for both platforms
self.addEventListener('activate', event => {
    console.log('Service Worker: Activated (Universal)');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
                        console.log('Service Worker: Clearing old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Ready to handle fetches');
            return self.clients.claim();
        })
    );
});