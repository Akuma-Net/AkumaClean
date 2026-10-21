/* Akuma Clean · sw.js — guarda la pantalla para que abra rápido.
   Los datos siempre se piden al servidor (nunca se guardan acá). */
var CACHE = 'akumaclean-v4';
var ARCHIVOS = ['./', 'index.html', 'config.js', 'estilos.css', 'core.js', 'demo.js', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'logo.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API y fuentes: directo a internet
  // primero la red (para tener siempre la última versión), si no hay conexión, lo guardado
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});
