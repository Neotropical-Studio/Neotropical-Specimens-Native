// Generación de URLs optimizadas servidas a través del proxy silencioso /api/media.

const PROXY = '/api/media';

export function imageUrl(publicId: string, extra: string[] = []): string {
  const t = ['f_auto', 'q_auto', 'fl_strip_profile', ...extra].join(',');
  return `${PROXY}/image/upload/${t}/${publicId}`;
}

export function videoHls(publicId: string): string {
  return `${PROXY}/video/upload/sp_hd_hls/${publicId}.m3u8`;
}

export function videoPoster(publicId: string): string {
  return `${PROXY}/video/upload/f_auto,q_auto,so_0/${publicId}.jpg`;
}

// MP4 progresivo (compatibilidad amplia: Chrome/Firefox/Safari) para clips cortos.
export function videoMp4(publicId: string): string {
  return `${PROXY}/video/upload/f_auto,q_auto/${publicId}.mp4`;
}

export function modelUrl(publicId: string): string {
  return `${PROXY}/raw/upload/${publicId}`;
}
