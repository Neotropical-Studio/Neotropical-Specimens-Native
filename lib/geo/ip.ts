// ============================================================================
// Detección de país por IP — plano B cuando el borde NO inyecta cabecera geo.
//
// Cloudflare/Vercel resuelven el país en su red (cf-ipcountry, x-vercel-ip-
// country) y eso es gratis e instantáneo: GEO_HEADERS siempre tiene prioridad.
// Pero este proyecto se despliega en modo `standalone` (DigitalOcean), donde no
// existe ninguna de esas cabeceras y la detección quedaría muerta. Aquí se
// resuelve el país desde la IP del cliente con un proveedor configurable.
//
// Reglas de diseño (se ejecuta en el borde, en la ruta crítica del request):
//   · Caché en memoria con TTL → una consulta por IP, no por petición.
//   · Timeout agresivo → si el proveedor tarda, se sigue sin país.
//   · Nunca lanza: sin proveedor o ante cualquier fallo devuelve null y la
//     negociación cae a Accept-Language (que no cuesta nada).
//   · Sólo fetch/Web APIs: compatible con el runtime edge.
//
// Proveedor por env (GEOIP_PROVIDER):
//   'ipapi'   → ip-api.com (sin clave; sólo http en el plan gratuito)
//   'ipinfo'  → ipinfo.io (GEOIP_API_KEY recomendado)
//   'custom'  → GEOIP_API_URL con el marcador {ip}; respuesta JSON
//   vacío / 'none' → desactivado (comportamiento por defecto: sin coste)
// ============================================================================

const PROVIDER = (process.env.GEOIP_PROVIDER ?? '').toLowerCase().trim();
const API_KEY = process.env.GEOIP_API_KEY ?? '';
const API_URL = process.env.GEOIP_API_URL ?? '';
const TIMEOUT_MS = Number(process.env.GEOIP_TIMEOUT_MS ?? 400);

// Cabeceras de IP del cliente, de más a menos fiable según el proxy delantero.
const IP_HEADERS = [
  'cf-connecting-ip',      // Cloudflare
  'true-client-ip',        // Cloudflare Enterprise / Akamai
  'x-real-ip',             // nginx
  'fly-client-ip',         // Fly.io
  'x-client-ip',
  'x-forwarded-for',       // estándar de facto: lista, el cliente va primero
];

export function isGeoIpConfigured(): boolean {
  if (PROVIDER === '' || PROVIDER === 'none') return false;
  return PROVIDER !== 'custom' || API_URL !== '';
}

// IPs que nunca sirven para geolocalizar (loopback, LAN, CGNAT, link-local).
function isPrivate(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) {
    return true;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false;
  if (p[0] === 10 || p[0] === 127) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
  return false;
}

// IP pública del visitante a partir de las cabeceras del proxy.
export function clientIp(headers: Headers): string | null {
  for (const key of IP_HEADERS) {
    const raw = headers.get(key);
    if (!raw) continue;
    for (const part of raw.split(',')) {
      // Normaliza formas '1.2.3.4:5678' y '[::1]:443' que añaden algunos proxies.
      const ip = part.trim().replace(/^\[|\]$/g, '').replace(/:\d+$/, '');
      if (ip && !isPrivate(ip)) return ip;
    }
  }
  return null;
}

// --- Caché en memoria (por instancia) ---------------------------------------
const TTL_MS = 6 * 60 * 60 * 1000;   // 6 h: la IP de un visitante no cambia de país
const MAX_ENTRIES = 5_000;           // cota de memoria en el borde
const cache = new Map<string, { at: number; country: string | null }>();

function cacheGet(ip: string): { country: string | null } | null {
  const hit = cache.get(ip);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(ip);
    return null;
  }
  return hit;
}

function cacheSet(ip: string, country: string | null): void {
  // Purga FIFO simple: Map conserva el orden de inserción.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(ip, { at: Date.now(), country });
}

// --- Proveedores -------------------------------------------------------------
function endpointFor(ip: string): string | null {
  if (PROVIDER === 'ipapi') {
    return `${API_URL || 'http://ip-api.com/json'}/${ip}?fields=status,countryCode`;
  }
  if (PROVIDER === 'ipinfo') {
    const base = API_URL || 'https://ipinfo.io';
    return `${base}/${ip}/json${API_KEY ? `?token=${API_KEY}` : ''}`;
  }
  if (PROVIDER === 'custom' && API_URL) {
    return API_URL.includes('{ip}') ? API_URL.replace('{ip}', ip) : `${API_URL}/${ip}`;
  }
  return null;
}

// Acepta las claves habituales de país entre proveedores.
function pickCountry(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const raw = o.countryCode ?? o.country_code ?? o.country ?? o.country_iso ?? null;
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

// País ISO-3166 alpha-2 del visitante según su IP, o null.
export async function countryFromIp(headers: Headers): Promise<string | null> {
  if (!isGeoIpConfigured()) return null;

  const ip = clientIp(headers);
  if (!ip) return null;

  const cached = cacheGet(ip);
  if (cached) return cached.country;

  const endpoint = endpointFor(ip);
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      // La caché la gestionamos nosotros (arriba); no la del fetch de Next.
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`geoip ${res.status}`);
    const country = pickCountry(await res.json());
    cacheSet(ip, country);
    return country;
  } catch {
    // Timeout, cuota agotada, proveedor caído… Memorizamos el fallo un rato para
    // no castigar cada request con la misma consulta condenada.
    cacheSet(ip, null);
    return null;
  }
}
