/* =============================================================================
 * Entomology Global Edge Engine — Service Worker
 * StaleWhileRevalidate + offline first + Background Sync.
 * Guard de latencia para entornos extremos (búnker / submarino / satélite).
 * ============================================================================= */

const CACHE = 'entmo-edge-2026.2';
const OFFLINE_URL = '/offline';
const SYNC_TAG = 'entmo-edge-sync';

// Sólo URLs que responden 200 directo. '/' NO se precachea: ahora redirige (307)
// al idioma de ruta y Cache.addAll rechaza respuestas redirigidas, lo que
// abortaría la instalación del SW. Las portadas /[lang] entran en caché solas
// con StaleWhileRevalidate en la primera visita.
const PRECACHE = [OFFLINE_URL];

// No cachear en el SW el streaming/proxy de media (Range/HLS) ni las APIs mutables.
const BYPASS = [/^\/api\/media\//, /^\/api\/webhooks\//];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS.some((re) => re.test(url.pathname))) return;

  // Navegaciones HTML: network-first para no servir un Application error /
  // HTML roto cacheado tras un deploy fallido. Assets: stale-while-revalidate.
  const isNavigate = request.mode === 'navigate';

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(request, res.clone());
          }
          return res;
        })
        .catch(() => null);

      if (isNavigate) {
        const fresh = (await network) || cached;
        if (fresh) return fresh;
        return cache.match(OFFLINE_URL);
      }

      const fresh = cached || (await network);
      if (fresh) return fresh;
      return new Response('', { status: 504, statusText: 'Offline' });
    }),
  );
});

// automatic_background_sync: reintenta la cola diferida al recuperar red.
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  const cache = await caches.open(`${CACHE}-queue`);
  const requests = await cache.keys();
  await Promise.all(
    requests.map(async (req) => {
      try {
        await fetch(req);
        await cache.delete(req);
      } catch {
        /* se reintenta en el próximo evento sync */
      }
    }),
  );
}
