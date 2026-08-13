/* =============================================================================
 * Entomology Global Edge Engine — Service Worker
 * Offline first para storefront. Admin + APIs: siempre red, nunca HTML cacheado.
 * ============================================================================= */

const CACHE = 'entmo-edge-2026.3-json-safe';
const OFFLINE_URL = '/offline';
const SYNC_TAG = 'entmo-edge-sync';

// Sólo URLs que responden 200 directo. '/' NO se precachea: redirige (307).
const PRECACHE = [OFFLINE_URL];

// Nunca interceptar: APIs (JSON), admin (panel), proxy media (Range/HLS).
const BYPASS = [
  /^\/api\//,
  /^\/admin(?:\/|$)/,
  /^\/studio(?:\/|$)/,
  /^\/_next\/webpack-hmr/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
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

  // Navegaciones HTML: network-first (evita Application error cacheado).
  // Assets: stale-while-revalidate real (sirve cache y actualiza en background).
  const isNavigate = request.mode === 'navigate';

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);

      const networkPromise = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const ct = res.headers.get('content-type') || '';
            // Nunca cachear JSON/HTML de error; solo assets estáticos.
            if (!ct.includes('application/json') && !ct.includes('text/html')) {
              cache.put(request, res.clone());
            }
          }
          return res;
        })
        .catch(() => null);

      if (isNavigate) {
        const fresh = (await networkPromise) || cached;
        if (fresh) return fresh;
        return cache.match(OFFLINE_URL);
      }

      // Stale-while-revalidate: devolver cache si hay, pero no bloquear update.
      if (cached) {
        void networkPromise;
        return cached;
      }
      const fresh = await networkPromise;
      if (fresh) return fresh;
      return new Response(JSON.stringify({ ok: false, error: 'offline' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

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
        /* retry next sync */
      }
    }),
  );
}
