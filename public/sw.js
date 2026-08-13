/* =============================================================================
 * Neotropical Specimens Native — Service Worker
 * Páginas = dinámicas / regenerativas (nunca HTML cacheado).
 * APIs = siempre red + JSON. Solo se cachean assets estáticos.
 * ============================================================================= */

const CACHE = 'neo-edge-2026.4-dynamic';
const SYNC_TAG = 'entmo-edge-sync';

// Nunca interceptar: APIs JSON, admin, studio, HMR.
const BYPASS = [
  /^\/api\//,
  /^\/admin(?:\/|$)/,
  /^\/studio(?:\/|$)/,
  /^\/_next\/webpack-hmr/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(pathname, contentType) {
  if (pathname.startsWith('/_next/static/')) return true;
  if (/\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|webp|avif|svg|ico|map)$/i.test(pathname)) {
    return true;
  }
  if (!contentType) return false;
  return (
    contentType.includes('javascript') ||
    contentType.includes('text/css') ||
    contentType.includes('font/') ||
    contentType.includes('image/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS.some((re) => re.test(url.pathname))) return;

  // Navegación HTML: SOLO red. Cero cache de páginas (catálogo regenerativo).
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({
              ok: false,
              error: 'offline',
              message: 'Catálogo dinámico: sin red no hay HTML cacheado.',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
          ),
      ),
    );
    return;
  }

  // Assets estáticos: stale-while-revalidate. Nunca JSON/HTML.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const ct = res.headers.get('content-type') || '';
            if (
              !ct.includes('text/html') &&
              !ct.includes('application/json') &&
              isStaticAsset(url.pathname, ct)
            ) {
              cache.put(request, res.clone());
            }
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        void networkPromise;
        return cached;
      }
      const fresh = await networkPromise;
      if (fresh) return fresh;
      return new Response(JSON.stringify({ ok: false, error: 'offline' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
