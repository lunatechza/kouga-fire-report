const CACHE_NAME = 'kouga-fire-v5';
const baseUrl = new URL('./', self.location);

const ASSETS = [
  baseUrl.href,
  new URL('index.html', baseUrl).href,
  new URL('embed.html', baseUrl).href,
  new URL('app.js', baseUrl).href,
  new URL('widget.js', baseUrl).href,
  new URL('manifest.json', baseUrl).href,
  new URL('icon.svg', baseUrl).href,
  new URL('assets/lunatech-icon.svg', baseUrl).href,
  new URL('offline.html', baseUrl).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() =>
          caches.match(new URL('offline.html', baseUrl).href)
        )
      );
    })
  );
});
