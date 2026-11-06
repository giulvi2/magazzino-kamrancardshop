// Service worker: salva l'app nella cache così si apre anche senza internet.
// Cambiare il numero quando si modifica questo file: le cache vecchie vengono cancellate.
const CACHE = 'magazzino-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([new Request('./', { cache: 'reload' })])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Prima prova la rete, se non c'è usa la cache.
// cache: 'no-cache' obbliga il browser a chiedere sempre a GitHub se il file è cambiato:
// senza, GitHub Pages fa tenere i file vecchi per 10 minuti.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)) }
        return r
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
  )
})
