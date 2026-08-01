/**
 * Inventario industrial de CARD/VIDEO de nodo.
 * NO se mezcla con fotos de producto/espécimen.
 *
 * Problema histórico: si la API Cloudinary fallaba/timeout, el catálogo
 * devolvía [] → «Sin imagen» (parecía borrado). Aquí:
 * 1) cache Next (revalidateTag)
 * 2) memoria last-good en instancia cálida
 * 3) tags + candidatos cover/intro de targets (sin wipe)
 */
import { unstable_cache, revalidateTag } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';
import { NEO_NODE_INVENTORY_TAGS } from '@/lib/media/node-tags';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
import { listNodeMediaUploadTargets } from '@/lib/mirror/contract';

const CACHE_TAG = 'neo-node-media';
const CACHE_SECONDS = 300;

/** Último inventario bueno (sobrevive timeouts en la misma instancia). */
let lastGoodInventory: string[] = [];

function cloudConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

async function fetchByTags(): Promise<string[]> {
  const out = new Set<string>();
  const types = ['image', 'video', 'raw'] as const;
  for (const tag of NEO_NODE_INVENTORY_TAGS) {
    for (const rt of types) {
      try {
        const res = await cloudinary.api.resources_by_tag(tag, {
          resource_type: rt,
          max_results: 500,
          type: 'upload',
        });
        for (const r of (res.resources ?? []) as Array<{ public_id?: string }>) {
          if (r.public_id) out.add(r.public_id);
        }
      } catch {
        /* tag vacío */
      }
    }
  }
  return [...out];
}

/** Candidatos estables cover/intro de todos los targets allowlist (sin listar 80k taxones). */
function expectedSlotPublicIds(): string[] {
  const out: string[] = [];
  for (const t of listNodeMediaUploadTargets()) {
    out.push(`${t.cardFolder.replace(/\/+$/, '')}/cover`);
    out.push(`${t.videoFolder.replace(/\/+$/, '')}/intro`);
  }
  return out;
}

/**
 * Prefijo RUBROS/ acotado: solo si tags vacíos. Máx 2 páginas × 3 tipos.
 * No escanear todo el árbol de 80k especímenes.
 */
async function fetchByRubrosPrefixLight(): Promise<string[]> {
  const out = new Set<string>();
  const types = ['image', 'video'] as const;
  for (const rt of types) {
    let nextCursor: string | undefined;
    let pages = 0;
    do {
      try {
        const res = (await cloudinary.api.resources({
          type: 'upload',
          resource_type: rt,
          prefix: 'RUBROS/',
          max_results: 500,
          next_cursor: nextCursor,
        })) as {
          resources?: Array<{ public_id?: string }>;
          next_cursor?: string;
        };
        for (const r of res.resources ?? []) {
          const pid = r.public_id;
          if (!pid) continue;
          if (pid.includes('/_card/') || pid.includes('/_video/')) {
            out.add(pid);
          }
        }
        nextCursor = res.next_cursor;
        pages += 1;
      } catch {
        nextCursor = undefined;
      }
    } while (nextCursor && pages < 2);
  }
  return [...out];
}

async function loadInventoryUncached(): Promise<string[]> {
  if (!cloudConfigured()) return lastGoodInventory;

  try {
    const tagged = await fetchByTags();
    const expected = expectedSlotPublicIds();
    const out = new Set<string>([...tagged, ...expected]);

    // Solo si no hay tags aún (cuenta nueva / uploads sin etiqueta).
    if (tagged.length === 0) {
      for (const pid of await fetchByRubrosPrefixLight()) out.add(pid);
    }

    const list = [...out];
    if (list.length > 0) lastGoodInventory = list;
    return list.length > 0 ? list : lastGoodInventory;
  } catch (err) {
    console.error('[neo-node-media] inventory failed; using last-good', err);
    return lastGoodInventory;
  }
}

export async function listNodeMediaInventoryPublicIds(): Promise<string[]> {
  if (!cloudConfigured()) return lastGoodInventory;

  const cached = unstable_cache(loadInventoryUncached, ['neo-node-media-inventory-v2'], {
    revalidate: CACHE_SECONDS,
    tags: [CACHE_TAG],
  });

  try {
    const list = await cached();
    if (list.length > 0) lastGoodInventory = list;
    return list.length > 0 ? list : lastGoodInventory;
  } catch (err) {
    console.error('[neo-node-media] cache read failed; using last-good', err);
    return lastGoodInventory;
  }
}

/** Llamar tras POST/DELETE de node-media para refrescar catálogo. */
export function invalidateNodeMediaInventory(): void {
  try {
    revalidateTag(CACHE_TAG);
  } catch {
    /* fuera de request Next */
  }
}

export { CACHE_TAG as NODE_MEDIA_CACHE_TAG };
