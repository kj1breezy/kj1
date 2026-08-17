/* Service worker for RAVE — caches the app shell so it opens instantly and
   works offline. Your trade data never passes through here: it lives in
   localStorage and (optionally) your own Google Drive, not in this cache. */
var CACHE_NAME = 'ledger-shell-v3';
var SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './sync.js',
  './coach.js',
  './manifest.json',
  './icons/icon-192-r3.png',
  './icons/icon-512-r3.png',
  './icons/logo-wordmark-r3.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES).catch(function () { /* fonts/CDN may fail offline-first install; ignore */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network-first for our own app files (so updates land promptly), falling
// back to cache when offline. Everything else (fonts, the Forex Factory feed,
// Google APIs) passes straight through to the network untouched.
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // let cross-origin requests go straight to network
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
