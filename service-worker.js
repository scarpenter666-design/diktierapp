// Service Worker: App-Shell offline verfuegbar machen.
// Modelldateien (HuggingFace/jsDelivr) werden vom Browser-Cache bzw. Cache Storage
// der Bibliotheken selbst gehalten und bewusst nicht hier dupliziert.
const CACHE = 'diktierapp-v2';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './export.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Update-Check: bei jeder Navigation pruefen, ob service-worker.js sich geaendert hat.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // App-Shell: cache-first. Externe CDNs (Modelle/Bibliotheken): network-first mit Cache-Fallback.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request))
    );
  } else {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
