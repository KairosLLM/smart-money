/* Smart Money Digest service worker — dependency-free, network-FIRST for HTML so an
   online visitor never gets a stale build (the classic PWA trap), cache-first for static
   assets, cache as offline fallback. Bump CACHE to force a clean sweep of old entries. */
const CACHE = 'smd-v1';
const ASSETS = [
  './', './index.html', './feed.xml',
  './favicon-32.png', './favicon-512.png', './apple-touch-icon.png', './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const wantsHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (wantsHTML) {
    // network-first: always try the live page, fall back to cache only when offline
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  // cache-first for immutable static assets (feeds, icons, per-piece pages)
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
    }).catch(() => m))
  );
});
