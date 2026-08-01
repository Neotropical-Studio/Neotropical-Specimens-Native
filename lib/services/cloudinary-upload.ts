import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import {
  assertAllowedOperationalFolder,
  assertCanonicalUploadFolder,
  isAllowedNodeMediaUploadFolder,
  isAllowedOperationalFolder,
  isCanonicalCataloguePublicId,
  isForbiddenCatalogueWriteTarget,
  isNodeMediaPublicId,
} from '@/lib/mirror/contract';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadTarget = 'image' | 'video' | 'raw';

interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
  /** Activar eliminación de fondo con Cloudinary AI (solo imágenes). */
  removeBg?: boolean;
  /**
   * 'specimen' → exige árbol canónico RUBROS/…/REGION…
   * 'operational' → campanas / documentos-legales (bloquea dumps _PENDING etc.)
   * 'node-media' → CARD/VIDEO de catálogo (_card|_video); ya validado en la API
   * default: si hay folder, aplica la más estricta que corresponda
   */
  pathPolicy?: 'specimen' | 'operational' | 'node-media';
  /**
   * Industrial: baja peso automáticamente (80k+ assets).
   * Fotos grandes → limit 2048 + eco; video → 1280p / ~800kbps.
   */
  industrial?: boolean;
}

/** Master liviano + eager web (catálogo / ficha). */
const IMAGE_TRANSFORM = [
  { fetch_format: 'auto', quality: 'auto:good', width: 2048, crop: 'limit', flags: 'strip_profile' },
];
const IMAGE_EAGER_OPTIMIZED = [
  { fetch_format: 'webp', quality: 'auto:eco', width: 720, crop: 'limit' },
  { fetch_format: 'webp', quality: 'auto:good', width: 1280, crop: 'limit' },
  { fetch_format: 'avif', quality: 'auto:good', width: 1280, crop: 'limit' },
];
/** Escala industrial: más agresivo (producto / lote). */
const IMAGE_TRANSFORM_INDUSTRIAL = [
  { fetch_format: 'auto', quality: 'auto:eco', width: 2048, crop: 'limit', flags: 'strip_profile' },
];
const IMAGE_EAGER_INDUSTRIAL = [
  { fetch_format: 'webp', quality: 'auto:eco', width: 480, crop: 'limit' },
  { fetch_format: 'webp', quality: 'auto:eco', width: 960, crop: 'limit' },
  { fetch_format: 'webp', quality: 'auto:good', width: 1440, crop: 'limit' },
];
const BG_REMOVAL_TRANSFORM = [
  { effect: 'background_removal' },
  { fetch_format: 'auto', quality: 'auto:best' },
];
const VIDEO_EAGER = [
  { streaming_profile: 'hd_hls', format: 'm3u8' },
  {
    format: 'mp4',
    quality: 'auto:eco',
    video_codec: 'h264',
    bit_rate: '900k',
    width: 1280,
    crop: 'limit',
  },
];
const VIDEO_TRANSFORM_INDUSTRIAL = [
  {
    quality: 'auto:eco',
    width: 1280,
    crop: 'limit',
    bit_rate: '800k',
    video_codec: 'h264',
  },
];

export async function uploadImage(
  file: string | Buffer,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> {
  const { removeBg, industrial, ...rest } = opts;
  if (removeBg) {
    return upload(file, 'image', {
      ...rest,
      transformation: BG_REMOVAL_TRANSFORM,
      background_removal: 'cloudinary_ai',
    });
  }
  return upload(file, 'image', {
    ...rest,
    transformation: industrial ? IMAGE_TRANSFORM_INDUSTRIAL : IMAGE_TRANSFORM,
    eager: industrial ? IMAGE_EAGER_INDUSTRIAL : IMAGE_EAGER_OPTIMIZED,
    eager_async: true,
  });
}

export async function uploadVideo(
  file: string | Buffer,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> {
  const { industrial, ...rest } = opts;
  return upload(file, 'video', {
    ...rest,
    eager: VIDEO_EAGER,
    eager_async: true,
    streaming_profile: 'hd_hls',
    transformation: industrial
      ? VIDEO_TRANSFORM_INDUSTRIAL
      : [{ quality: 'auto:eco', width: 1280, crop: 'limit', bit_rate: '1000k' }],
  });
}

export async function uploadModel3d(
  file: string | Buffer,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> {
  return upload(file, 'raw', { ...opts });
}

/**
 * Productos/especímenes NUNCA pueden escribir en _card/_video
 * (evita “borrar” CARD/VIDEO de catálogo al subir fotos de producto).
 */
export function assertNotNodeMediaSlotPath(folderOrId: string): void {
  const t = folderOrId.replace(/^\/+|\/+$/g, '');
  if (isNodeMediaPublicId(t) || isAllowedNodeMediaUploadFolder(t)) {
    throw new Error(
      `PROHIBIDO: «${t}» es slot CARD/VIDEO de catálogo. Subí productos en la carpeta del taxón, no en _card/_video.`,
    );
  }
  if (t.includes('/_card') || t.includes('/_video') || /(^|\/)(card|video)(\/|$)/i.test(t)) {
    throw new Error(
      `PROHIBIDO: path de producto no puede contener _card/_video («${t}»).`,
    );
  }
}

function enforceUploadPath(
  folder: string | undefined,
  publicId: string | undefined,
  pathPolicy?: UploadOptions['pathPolicy'],
): void {
  const target = (folder ?? publicId ?? '').replace(/^\/+|\/+$/g, '');
  if (!target) {
    throw new Error(
      'Upload bloqueado: falta folder/public_id. No se sube a la raíz de Cloudinary.',
    );
  }
  // Espejo CARD/VIDEO: la API ya validó allowlist (incl. familias renombradas vía meta).
  if (pathPolicy === 'node-media') {
    if (!/\/(_card|_video)$/.test(target)) {
      throw new Error(
        `Upload CARD/VIDEO: la carpeta debe terminar en /_card o /_video. Recibido: «${target}».`,
      );
    }
    return;
  }
  // Node media universal: rubro / región / categoría / familia → _card|_video
  if (isAllowedNodeMediaUploadFolder(target)) {
    return;
  }
  if (pathPolicy === 'specimen') {
    assertNotNodeMediaSlotPath(target);
    assertCanonicalUploadFolder(folder ?? target);
    return;
  }
  if (pathPolicy === 'operational' || isAllowedOperationalFolder(folder ?? target)) {
    assertAllowedOperationalFolder(folder ?? target);
    return;
  }
  if (isCanonicalCataloguePublicId(folder ?? target)) {
    assertNotNodeMediaSlotPath(target);
    assertCanonicalUploadFolder(folder ?? target);
    return;
  }
  if (isForbiddenCatalogueWriteTarget(target)) {
    throw new Error(
      `Upload bloqueado: «${target}» está fuera del árbol canónico y no es carpeta operativa.`,
    );
  }
}

async function upload(
  file: string | Buffer,
  resource_type: UploadTarget,
  extra: Record<string, unknown>,
): Promise<UploadApiResponse> {
  const { folder, publicId, tags, context, pathPolicy, ...rest } = extra as UploadOptions &
    Record<string, unknown>;
  enforceUploadPath(
    typeof folder === 'string' ? folder : undefined,
    typeof publicId === 'string' ? publicId : undefined,
    pathPolicy,
  );
  const options = {
    resource_type,
    folder,
    public_id: publicId,
    tags,
    context,
    overwrite: true,
    invalidate: true,
    unique_filename: false,
    use_filename: true,
    ...rest,
  };

  if (Buffer.isBuffer(file)) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
        if (err || !res) return reject(err ?? new Error('Upload failed'));
        resolve(res);
      });
      stream.end(file);
    });
  }

  return cloudinary.uploader.upload(file, options);
}

/** Lista assets bajo una carpeta de node media (prefix). Escanea image+video+raw. */
export async function listFolderResources(
  folder: string,
  resourceType: UploadTarget | 'all' = 'all',
): Promise<Array<{ publicId: string; secureUrl: string; resourceType: string }>> {
  const f = folder.replace(/^\/+|\/+$/g, '');
  const prefix = `${f}/`;
  if (!isAllowedNodeMediaUploadFolder(f)) {
    throw new Error(`Listado bloqueado: carpeta no allowlist «${folder}».`);
  }
  const types: UploadTarget[] =
    resourceType === 'all' ? ['image', 'video', 'raw'] : [resourceType];
  const out: Array<{ publicId: string; secureUrl: string; resourceType: string }> = [];
  for (const rt of types) {
    try {
      const res = await cloudinary.api.resources({
        type: 'upload',
        resource_type: rt,
        prefix,
        max_results: 50,
      });
      const resources = (res.resources ?? []) as Array<{
        public_id: string;
        secure_url: string;
        resource_type?: string;
      }>;
      for (const r of resources) {
        out.push({
          publicId: r.public_id,
          secureUrl: r.secure_url,
          resourceType: r.resource_type ?? rt,
        });
      }
    } catch {
      /* carpeta vacía / tipo sin assets */
    }
  }
  return out;
}

/** Re-export: inventario cacheado + last-good (no vaciar catálogo si Cloudinary falla). */
export { listNodeMediaInventoryPublicIds } from '@/lib/services/node-media-inventory';

/**
 * Borra assets de una carpeta _card/_video allowlist.
 * Solo vía DELETE /api/admin/node-media (admin autenticado).
 * Nunca llamar desde POST upload (si el upload falla, no se pierde el media viejo).
 */
export async function clearNodeMediaFolder(
  folder: string,
  _resourceType?: UploadTarget,
): Promise<{ deleted: number }> {
  const f = folder.replace(/^\/+|\/+$/g, '');
  if (!isAllowedNodeMediaUploadFolder(f)) {
    throw new Error(`Borrado bloqueado: carpeta no allowlist «${f}».`);
  }
  const prefix = `${f}/`;
  let deleted = 0;
  for (const rt of ['image', 'video', 'raw'] as const) {
    try {
      const result = await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: rt,
        invalidate: true,
      });
      const deletedMap = (result.deleted ?? {}) as Record<string, string>;
      deleted += Object.values(deletedMap).filter((v) => v === 'deleted').length;
    } catch {
      /* ignore empty */
    }
  }
  return { deleted };
}

export { cloudinary };
