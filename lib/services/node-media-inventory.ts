/**
 * Inventario industrial de CARD/VIDEO de nodo (storefront).
 *
 * Arquitectura (escala 80k blobs / N slots de catálogo):
 * 1) Fuente de verdad = tabla `node_media` (Supabase registry)
 * 2) Cloudinary = archivos + tags de recuperación
 * 3) Cache Next + last-good en instancia
 *
 * NUNCA inventa public_ids cover/intro.
 * Si no hay fila / no hay tag → Sin imagen (correcto).
 * Eliminar quita Cloudinary + fila registry → catálogo deja de mostrar.
 */
import { unstable_cache, revalidateTag } from 'next/cache';
import {
  bootstrapRegistryFromCloudinaryTags,
  fetchTaggedNodeMediaPublicIds,
  listRegistryPublicIds,
} from '@/lib/services/node-media-registry';
import { isSupabaseAdminConfigured } from '@/lib/supabase/client';

const CACHE_TAG = 'neo-node-media';
const CACHE_SECONDS = 120;

/** Último inventario bueno (sobrevive timeouts en la misma instancia). */
let lastGoodInventory: string[] = [];

async function loadInventoryUncached(): Promise<string[]> {
  try {
    // 1) Registry DB (industrial, O(slots), regenerativo).
    const fromDb = await listRegistryPublicIds();

    if (fromDb && fromDb.length > 0) {
      lastGoodInventory = fromDb;
      return fromDb;
    }

    // 2) Tabla vacía o aún no migrada → bootstrap desde tags Cloudinary (una vez).
    if (fromDb && fromDb.length === 0 && isSupabaseAdminConfigured()) {
      const seeded = await bootstrapRegistryFromCloudinaryTags();
      if (seeded.length > 0) {
        lastGoodInventory = seeded;
        return seeded;
      }
    }

    // 3) Fallback lectura tags (sin escribir DB si no hay service_role).
    if (!fromDb || fromDb.length === 0) {
      const tagged = await fetchTaggedNodeMediaPublicIds();
      if (tagged.length > 0) {
        lastGoodInventory = tagged;
        return tagged;
      }
    }

    return lastGoodInventory;
  } catch (err) {
    console.error('[neo-node-media] inventory failed; using last-good', err);
    return lastGoodInventory;
  }
}

export async function listNodeMediaInventoryPublicIds(): Promise<string[]> {
  const cached = unstable_cache(loadInventoryUncached, ['neo-node-media-inventory-v4'], {
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

/**
 * Invalidar tras POST/DELETE.
 * `removedPrefix` = carpeta _card|_video: limpia last-good de esta instancia al instante.
 */
export function invalidateNodeMediaInventory(removedPrefix?: string): void {
  if (removedPrefix?.trim()) {
    const base = removedPrefix.replace(/\/+$/, '');
    const p = `${base}/`;
    lastGoodInventory = lastGoodInventory.filter(
      (id) => !id.startsWith(p) && id !== base && !id.startsWith(`${base}/`),
    );
  }
  try {
    revalidateTag(CACHE_TAG);
  } catch {
    /* fuera de request Next */
  }
}

export { CACHE_TAG as NODE_MEDIA_CACHE_TAG };
