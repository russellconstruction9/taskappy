importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js'
);

// App shell cache name
const CACHE_NAME = 'workflow-v1';
const OFFLINE_URL = '/';

// Cache app shell on install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/manifest.json',
                '/assets/icons/192x192.png',
                '/assets/icons/512x512.png'
            ]);
        })
    );
    self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch with network-first for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip cross-origin requests except fonts
    if (!request.url.startsWith(self.location.origin) &&
        !request.url.includes('fonts.googleapis.com') &&
        !request.url.includes('fonts.gstatic.com')) {
        return;
    }

    event.respondWith(
        (async () => {
            // For navigation requests, try network first
            if (request.mode === 'navigate') {
                try {
                    const networkResponse = await fetch(request);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                } catch {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) return cachedResponse;
                    return caches.match(OFFLINE_URL);
                }
            }

            // For other requests, try cache first
            const cachedResponse = await caches.match(request);
            if (cachedResponse) return cachedResponse;

            try {
                const networkResponse = await fetch(request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
                return networkResponse;
            } catch {
                // Return offline page for failed navigation
                if (request.destination === 'document') {
                    return caches.match(OFFLINE_URL);
                }
                throw new Error('Network request failed');
            }
        })()
    );
});

// Widget handling (Windows 11)
self.addEventListener('widgetinstall', (event) => {
    event.waitUntil(updateWidget(event));
});

self.addEventListener('widgetresume', (event) => {
    event.waitUntil(updateWidget(event));
});

self.addEventListener('widgetclick', (event) => {
    if (event.action == "updateName") {
        event.waitUntil(updateName(event));
    }
});

self.addEventListener('widgetuninstall', (event) => {});

const updateWidget = async (event) => {
    const widgetDefinition = event.widget.definition;
    const payload = {
        template: JSON.stringify(await (await fetch(widgetDefinition.msAcTemplate)).json()),
        data: JSON.stringify(await (await fetch(widgetDefinition.data)).json()),
    };
    await self.widgets.updateByInstanceId(event.instanceId, payload);
}

const updateName = async (event) => {
    const name = event.data.json().name;
    const widgetDefinition = event.widget.definition;
    const payload = {
        template: JSON.stringify(await (await fetch(widgetDefinition.msAcTemplate)).json()),
        data: JSON.stringify({name}),
    };
    await self.widgets.updateByInstanceId(event.instanceId, payload);
}

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);