// Guarda la app en el celular para que abra y muestre el QR sin señal.
var CACHE = "catedra-alumno-v3";
var ARCHIVOS = ["./", "index.html", "qrcode.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "../config.js", "../catedra.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Primero la red (para tener la versión nueva) y, si no hay señal, lo guardado.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) { return; }
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); })
  );
});
