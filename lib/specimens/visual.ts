import type { ThemePalette } from '@/lib/theme/palette';

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function trimDark(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return `#${value.split('').map((c) => c + c).join('')}`;
  }
  return `#${value}`;
}

function ensureContrast(hex: string, fallback: ThemePalette): ThemePalette {
  const normalized = trimDark(hex);
  return {
    primary: normalized,
    accent: normalized,
    surface: fallback.surface,
    text: fallback.text,
  };
}

/**
 * Reescribe URLs de Cloudinary a `/api/media/...` (mismo origen) para poder
 * leer el canvas sin SecurityError por CORS. Si ya es same-origin, se deja.
 */
function toSameOriginSrc(src: string): string {
  const raw = (src ?? '').trim();
  if (!raw) return raw;
  if (raw.startsWith('/') || raw.startsWith('blob:') || raw.startsWith('data:')) return raw;

  try {
    const u = new URL(raw);
    if (!/res\.cloudinary\.com$/i.test(u.hostname)) return raw;
    // https://res.cloudinary.com/<cloud>/<resource>/upload/... → /api/media/<resource>/upload/...
    const parts = u.pathname.replace(/^\/+/, '').split('/');
    // parts[0] = cloud name
    if (parts.length < 2) return raw;
    const rest = parts.slice(1).join('/');
    return `/api/media/${rest}${u.search}`;
  } catch {
    return raw;
  }
}

/**
 * Extrae una paleta dominante de una imagen.
 * Usa proxy same-origin para evitar canvas tainted / SecurityError en el overlay
 * de Next.js; si algo falla, devuelve `fallback` sin tumbar la UI.
 */
export async function extractDominantPaletteFromImage(
  src: string,
  fallback: ThemePalette,
): Promise<ThemePalette> {
  if (!src || typeof window === 'undefined') return fallback;

  try {
    const image = new Image();
    image.decoding = 'async';
    // Same-origin (proxy) no requiere CORS; para URLs externas residuales
    // mantenemos anonymous por si el CDN sí envía ACAO.
    const sameOrigin = toSameOriginSrc(src);
    if (!sameOrigin.startsWith('/')) {
      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';
    }
    image.src = sameOrigin;

    try {
      await image.decode();
    } catch {
      return fallback;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;

    const width = Math.min(160, image.naturalWidth || image.width || 160);
    const height = Math.min(160, image.naturalHeight || image.height || 160);
    if (width <= 0 || height <= 0) return fallback;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch {
      // Canvas tainted u otro SecurityError — no tumbar Next Dev Overlay.
      return fallback;
    }

    const pixels: Array<[number, number, number]> = [];
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4 * 8) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      if (alpha > 80) pixels.push([r, g, b]);
    }

    if (!pixels.length) return fallback;

    const bucket = new Map<string, number>();
    for (const [r, g, b] of pixels) {
      const key = toHex([
        Math.round(r / 32) * 32,
        Math.round(g / 32) * 32,
        Math.round(b / 32) * 32,
      ]);
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
    }

    const pick = [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!pick) return fallback;

    const base = ensureContrast(pick, fallback);
    return {
      ...fallback,
      primary: base.primary,
      accent: base.accent,
      surface: fallback.surface,
      text: fallback.text,
    };
  } catch {
    return fallback;
  }
}
