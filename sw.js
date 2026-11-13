// Service worker: makes Morbid Racers installable and fully playable offline.
// VERSION is replaced with the commit SHA on deploy, so every release gets a fresh cache.
const VERSION = 'dev';
const CACHE = `morbid-racers-${VERSION}`;
const SOUNDTRACK = 'Morbid_Fingers%20-%20live-%20Emmerich_Juli_2003%20-%2003%20Redemption.mp3';
const ASSETS = ['./', 'index.html', 'CHANGELOG.md', 'style.css', 'effects.css', 'game.js', 'pwa.js', 'manifest.webmanifest',
  'fonts/fonts.css', 'fonts/barlow-400.woff2', 'fonts/barlow-500.woff2', 'fonts/barlow-600.woff2', 'fonts/barlow-700.woff2', 'fonts/barlow-800.woff2', 'fonts/barlow-900.woff2', 'fonts/barlow-condensed-500.woff2', 'fonts/barlow-condensed-600.woff2', 'fonts/barlow-condensed-700.woff2', 'fonts/barlow-condensed-800.woff2', 'fonts/barlow-condensed-900.woff2', 'fonts/share-tech-mono-400.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', SOUNDTRACK,
  ...['alien-killer', 'fatality', 'ufo-obliterated', 'abduct-this', 'invasion-cancelled', 'close-encounter', 'saucer-smashed', 'green-men-down', 'probe-denied',
    'area-51', 'toasted-saucer', 'mothership', 'ultra-kill', 'galactic-humiliation', 'no-parking', 'return-to-sender', 'hyperdrive-initiated', 'first-place', 'mothership-warning', 'mothership-down', 'invasion-incoming', 'congratulations', 'next-boss', 'scream-overlord', 'scream-cyclops', 'scream-maggot', 'scream-robot', ...['vex', 'kronos', 'null9', 'blaze'].flatMap(n => [`taunt-${n}`, `down-${n}`])].map(clip => `voice/${clip}.mp3`)];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new Request(path, { cache: 'reload' })))));
  // A first install activates at once; an update waits until the page says the player is not mid-race.
  if (!self.registration.active) self.skipWaiting();
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Audio elements request byte ranges; answer them from the cached file.
async function rangeResponse(request) {
  const cached = await caches.match(request.url, { ignoreSearch: true });
  if (!cached) return fetch(request);
  const body = await cached.arrayBuffer();
  const [, from, to] = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range')) || [];
  const start = from ? Number(from) : Math.max(0, body.byteLength - Number(to));
  const end = from && to ? Math.min(Number(to), body.byteLength - 1) : body.byteLength - 1;
  if (start > end || start >= body.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${body.byteLength}` } });
  return new Response(body.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${body.byteLength}`,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./', response.clone());
    return response;
  } catch {
    return (await cache.match('./')) || (await cache.match('index.html')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === location.origin) {
    if (request.headers.has('range')) event.respondWith(rangeResponse(request));
    else if (request.mode === 'navigate') event.respondWith(networkFirst(request));
    else event.respondWith(cacheFirst(request));
  }
});
