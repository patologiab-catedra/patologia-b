/* Service worker mínimo de las páginas de docentes: solo hace que el navegador
   ofrezca instalarlas como app. No guarda nada en caché (el escáner ya guarda
   lo suyo en el celular), así cada cambio publicado se ve enseguida. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function () {});
