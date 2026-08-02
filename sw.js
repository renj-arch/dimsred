const CACHE = 'vlymbooq-v7';
const STATIC_ASSETS = [
  '/css/style.css',
  '/js/theme.js',
  '/js/shared.js',
  '/favicon.svg',
  '/logo.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var path = e.request.url.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
  var isHtml = /\.html$/.test(path) || path === '/' || path === '';
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached && !isHtml) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.ok && resp.type === 'basic' && !isHtml) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return cached || caches.match(e.request);
      });
    })
  );
});
