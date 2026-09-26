// Change this version whenever you change any app file so phones pick up the update. Keep it the same as the version in index.html.
const CACHE = 'clinical-hours-1.0.2';
const ASSETS = [
  './',
  './styles.css',
  './app.js',
  './importer.js',
  './theme.js',
  './manifest.webmanifest',
  './fonts/geist-latin.woff2',
  './fonts/geist-latin-ext.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores stale files.
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Removes older versions, including the Google Fonts cache from v4 (the font is bundled now).
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// A cached response that came through a redirect can't be used to answer a page load, so hand back a plain copy.
const plain = (res) => (res.redirected
  ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers })
  : res);

// Serve the app from the versioned cache so it opens instantly and works offline.
// Updates arrive when CACHE above changes: the browser installs the new worker, and the page offers a reload.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Pages open from the cached './' (the app's start page), so a host that redirects /index.html to / can't break offline opens
    const cached = req.mode === 'navigate'
      ? await cache.match('./')
      : await cache.match(req, { ignoreSearch: true });
    if (cached) return plain(cached);
    try {
      return await fetch(req);
    } catch {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
