// ============================================================================
// Generación de URLs Cloudinary — defensivo ante undefined/null en build
// estático de Vercel (nunca hacer `.length` ni spread sobre valores dudosos).
// ============================================================================

const PROXY = '/api/media';

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function cloudinaryCloudName(): string {
  const fromEnv =
    asString(process.env.CLOUDINARY_CLOUD_NAME) ||
    asString(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  return fromEnv.length > 0 ? fromEnv : 'juufg4mn';
}

/**
 * Extrae el public_id de una URL de Cloudinary (con o sin versión / extensión)
 * o devuelve el string tal cual si ya parece un public_id.
 */
export function resolveCloudinaryPublicId(input: string): string {
  const raw = asString(input).trim();
  if (raw.length === 0) return '';
  if (!isExternalUrl(raw)) {
    return raw.replace(/\.(png|jpe?g|webp|gif|avif)$/i, '');
  }
  const uploadIdx = raw.indexOf('/upload/');
  if (uploadIdx < 0) return raw;
  const afterUpload = raw.slice(uploadIdx + '/upload/'.length).split(/[?#]/)[0] ?? '';
  const parts = afterUpload.split('/').filter(Boolean);
  // Omite bloques de transformación (contienen comas) y el segmento de versión (v123).
  const idParts = parts.filter((p) => !p.includes(',') && !/^v\d+$/i.test(p));
  if (idParts.length === 0) return raw;
  return idParts.join('/').replace(/\.(png|jpe?g|webp|gif|avif)$/i, '');
}

/** Versión Cloudinary (`v1739…`) desde secure_url — para bustear CDN tras overwrite. */
export function parseCloudinaryVersion(
  secureUrl: string | null | undefined,
): number | null {
  const raw = asString(secureUrl).trim();
  if (!raw) return null;
  const m = raw.match(/\/upload\/(?:[^/]+\/)*v(\d+)\//i);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function imageUrl(
  publicId: string,
  extra: string[] = [],
  version?: number | null,
): string {
  // CDN directo (misma estrategia que brand/permits). El proxy /api/media
  // sigue disponible para video/raw; para imágenes el CDN público es fiable.
  return cloudinaryImageUrl(publicId, extra, version);
}

export function cloudinaryImageUrl(
  publicId: string,
  extra: string[] = [],
  version?: number | null,
): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) {
    if (!/res\.cloudinary\.com/i.test(id)) return id;
    const resolved = resolveCloudinaryPublicId(id);
    if (resolved.length === 0 || isExternalUrl(resolved)) return id;
    const ver = version ?? parseCloudinaryVersion(id);
    return cloudinaryImageUrl(resolved, extra, ver);
  }
  const extras = asStringArray(extra);
  // Si el caller pide formato explícito (p. ej. f_png para alfa), no forzar f_auto.
  const hasFormat = extras.some((p) => /^f_/.test(p));
  const hasQuality = extras.some((p) => /^q_/.test(p));
  const parts = [
    ...(hasFormat ? [] : ['f_auto']),
    ...(hasQuality ? [] : ['q_auto']),
    ...extras,
  ];
  const verSeg =
    typeof version === 'number' && Number.isFinite(version) && version > 0
      ? `v${Math.floor(version)}/`
      : '';
  return `https://res.cloudinary.com/${cloudinaryCloudName()}/image/upload/${parts.join(',')}/${verSeg}${id}`;
}

export function videoHls(publicId: string): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  return `${PROXY}/video/upload/sp_hd_hls/${id}.m3u8`;
}

export function videoPoster(publicId: string): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  return `${PROXY}/video/upload/f_auto,q_auto,so_0/${id}.jpg`;
}

export function videoMp4(publicId: string): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  // MP4 liviano: q_auto + tope 1280 (renders Blender / intros).
  return `${PROXY}/video/upload/f_mp4,q_auto:good,w_1280,c_limit/${id}.mp4`;
}

/**
 * Imagen de catálogo optimizada (WebP/AVIF vía f_auto) + peso acotado.
 * Dinámica: el CDN elige formato según el navegador.
 */
export function catalogCardImageUrl(
  publicId: string,
  opts: { width?: number; chameleonHex?: string; version?: number | null } = {},
): string {
  const w = opts.width ?? 720;
  const extra = [`w_${w}`, 'c_fill', 'g_auto', 'q_auto:good'];
  // Tinte camaleónico suave (regenerativo por taxón/rubro).
  if (opts.chameleonHex && /^#?[0-9a-f]{6}$/i.test(opts.chameleonHex)) {
    const hex = opts.chameleonHex.replace(/^#/, '');
    extra.push(`e_colorize:12`, `co_rgb:${hex}`);
  }
  return imageUrl(publicId, extra, opts.version);
}

export function modelUrl(publicId: string): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  return `${PROXY}/raw/upload/${id}`;
}
