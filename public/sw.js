// Service worker: salva l'app nella cache così si apre anche senza internet.
const CACHE = 'magazzino-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
// Prima prova la rete (per avere sempre l'ultima versione), se non c'è usa la cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  )
})
