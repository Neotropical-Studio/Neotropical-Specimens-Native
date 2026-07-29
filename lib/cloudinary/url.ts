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

export function imageUrl(publicId: string, extra: string[] = []): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  const parts = ['f_auto', 'q_auto', 'fl_strip_profile', ...asStringArray(extra)];
  return `${PROXY}/image/upload/${parts.join(',')}/${id}`;
}

export function cloudinaryImageUrl(publicId: string, extra: string[] = []): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  const parts = ['f_auto', 'q_auto', ...asStringArray(extra)];
  return `https://res.cloudinary.com/${cloudinaryCloudName()}/image/upload/${parts.join(',')}/${id}`;
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
  return `${PROXY}/video/upload/f_auto,q_auto/${id}.mp4`;
}

export function modelUrl(publicId: string): string {
  const id = asString(publicId);
  if (id.length === 0) return '';
  if (isExternalUrl(id)) return id;
  return `${PROXY}/raw/upload/${id}`;
}
