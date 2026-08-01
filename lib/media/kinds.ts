// ============================================================================
// Media industrial: CERO listas rígidas de formatos “permitidos”.
// Clasificación regenerativa por MIME (el navegador/OS manda). Extensiones
// solo como fallback cuando el MIME viene vacío u octet-stream.
// Futuros formatos (nuevo codec, nuevo 3D, etc.) entran solos si el MIME
// es image/* | video/* | model/* — sin tocar código.
// Entrega: Cloudinary f_auto / q_auto / HLS (peso bajo, dinámico).
// ============================================================================

export type MediaKind = 'image' | 'video' | 'model3d';

/** Fallback mínimo cuando el browser no manda MIME útil (octet-stream / vacío). */
const EXT_HINT: Record<string, MediaKind> = {
  // 3D
  glb: 'model3d',
  gltf: 'model3d',
  usdz: 'model3d',
  // video (Blender / NLE)
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
  mkv: 'video',
  avi: 'video',
  ogv: 'video',
  // imagen
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  avif: 'image',
  gif: 'image',
  heic: 'image',
  heif: 'image',
  tif: 'image',
  tiff: 'image',
  bmp: 'image',
};

export function extOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return (m?.[1] ?? '').toLowerCase();
}

/**
 * Detecta kind sin hardcodear allowlists cerradas.
 * 1) MIME image|video|model
 * 2) hint por extensión solo si MIME vacío/octet-stream
 * 3) null → el caller decide mensaje genérico
 */
export function detectMediaKind(file: {
  name?: string;
  type?: string;
}): MediaKind | null {
  const mime = (file.type ?? '').trim().toLowerCase();
  const ext = extOf(file.name ?? '');

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('model/') || mime.includes('gltf') || mime.includes('usd')) {
    return 'model3d';
  }

  if (!mime || mime === 'application/octet-stream' || mime === 'application/zip') {
    return EXT_HINT[ext] ?? null;
  }

  return null;
}

/**
 * Inputs abiertos: wildcards MIME + hints 3D.
 * No enumerar codecs futuros — `image/*` y `video/*` los cubren.
 */
export const ACCEPT_CARD = 'image/*,.glb,.gltf,.usdz,model/gltf-binary,model/gltf+json';
export const ACCEPT_VIDEO = 'video/*';
export const ACCEPT_MODEL3D = '.glb,.gltf,.usdz,model/gltf-binary,model/gltf+json';
export const ACCEPT_ANY_MEDIA = 'image/*,video/*,.glb,.gltf,.usdz';
