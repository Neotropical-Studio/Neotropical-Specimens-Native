// Generación de URLs optimizadas servidas a través del proxy silencioso /api/media.

const PROXY = '/api/media';

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function cloudinaryCloudName(): string {
  return process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
}

export function imageUrl(publicId: string, extra: string[] = []): string {
  if (!publicId) return '';
  if (isExternalUrl(publicId)) return publicId;
  const t = ['f_auto', 'q_auto', 'fl_strip_profile', ...extra].join(',');
  return `${PROXY}/image/upload/${t}/${publicId}`;
}

export function cloudinaryImageUrl(publicId: string, extra: string[] = []): string {
  if (!publicId) return '';
  if (isExternalUrl(publicId)) return publicId;
  const t = ['f_auto', 'q_auto', ...extra].join(',');
  return `https://res.cloudinary.com/${cloudinaryCloudName()}/image/upload/${t}/${publicId}`;
}

export function videoHls(publicId: string): string {
  if (!publicId) return '';
  if (isExternalUrl(publicId)) return publicId;
  return `${PROXY}/video/upload/sp_hd_hls/${publicId}.m3u8`;
}

export function videoPoster(publicId: string): string {
  if (!publicId) return '';
  if (isExternalUrl(publicId)) return publicId;
  return `${PROXY}/video/upload/f_auto,q_auto,so_0/${publicId}.jpg`;
}

// MP4 progresivo (compatibilidad amplia: Chrome/Firefox/Safari) para clips cortos.
export function videoMp4(publicId: string): string {
  if (!publicId) return '';
  if (isExternalUrl(publicId)) return publicId;
  return `${PROXY}/video/upload/f_auto,q_auto/${publicId}.mp4`;
}

export function modelUrl(publicId: string): string {
  if (!publicId) return '';
  if (isExternalUrl(publicId)) return publicId;
  return `${PROXY}/raw/upload/${publicId}`;
}
