// Service worker minimo: serve a rendere l'app installabile.
// Non mette nulla in cache; la pagina dell'app viene sempre riscaricata dal server,
// cosi' le modifiche arrivano subito (HA di norma la fa tenere in cache per un mese).
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.mode === 'navigate' && u.pathname.indexOf('/local/config/audio/') === 0) {
    e.respondWith(fetch(e.request.url, { cache: 'reload' }).catch(function () { return fetch(e.request); }));
  }
});
