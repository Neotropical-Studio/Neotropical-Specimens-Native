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
  fetchTaggedNodeMediaInventory,
  listRegistryInventory,
  type NodeMediaInventoryEntry,
} from '@/lib/services/node-media-registry';
import { isSupabaseAdminConfigured } from '@/lib/supabase/client';

const CACHE_TAG = 'neo-node-media';
const CACHE_SECONDS = 30;

/** Último inventario bueno (sobrevive timeouts en la misma instancia). */
let lastGoodInventory: NodeMediaInventoryEntry[] = [];

async function loadInventoryUncached(): Promise<NodeMediaInventoryEntry[]> {
  try {
    // 1) Registry DB (industrial, O(slots), regenerativo).
    const fromDb = await listRegistryInventory();

    if (fromDb && fromDb.length > 0) {
      lastGoodInventory = fromDb;
      return fromDb;
    }

    // 2) Tabla vacía o aún no migrada → bootstrap desde tags Cloudinary (una vez).
    if (fromDb && fromDb.length === 0 && isSupabaseAdminConfigured()) {
      const seeded = await bootstrapRegistryFromCloudinaryTags();
      if (seeded.length > 0) {
        // Releer DB (con metadata/versión si se guardó); si falla, tags con versión.
        const again = await listRegistryInventory();
        if (again && again.length > 0) {
          lastGoodInventory = again;
          return again;
        }
      }
    }

    // 3) Fallback tags Cloudinary CON versión CDN (funciona sin tabla node_media).
    if (!fromDb || fromDb.length === 0) {
      const tagged = await fetchTaggedNodeMediaInventory();
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

export async function listNodeMediaInventoryEntries(): Promise<NodeMediaInventoryEntry[]> {
  const cached = unstable_cache(loadInventoryUncached, ['neo-node-media-inventory-v6'], {
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

export async function listNodeMediaInventoryPublicIds(): Promise<string[]> {
  const entries = await listNodeMediaInventoryEntries();
  return entries.map((e) => e.publicId);
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
      (e) =>
        !e.publicId.startsWith(p) &&
        e.publicId !== base &&
        !e.publicId.startsWith(`${base}/`),
    );
  } else {
    // Upload/replace: vaciar last-good para no servir IDs stale en esta instancia.
    lastGoodInventory = [];
  }
  try {
    revalidateTag(CACHE_TAG);
  } catch {
    /* fuera de request Next */
  }
}

export { CACHE_TAG as NODE_MEDIA_CACHE_TAG };
export type { NodeMediaInventoryEntry };
