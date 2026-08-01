/**
 * Targets CARD/VIDEO con familias VIVAS (misma fuente que el storefront).
 * Solo usar desde Server Components / Route Handlers (no client).
 */
import {
  listNodeMediaUploadTargets,
  type NodeMediaUploadTarget,
} from '@/lib/mirror/contract';

/**
 * Orden: meta Cloudinary (renombres libres) → Supabase → labels por scope → hardcoded.
 * Así el admin y la web ven los mismos nombres sin pedirle a nadie que “actualice código”.
 */
export async function listNodeMediaUploadTargetsResolved(): Promise<
  NodeMediaUploadTarget[]
> {
  try {
    const overrides = new Map<
      string,
      Array<{ label: string; folder: string }>
    >();

    // 1) Meta JSON Cloudinary (fuente libre de renombres)
    try {
      const { readCatalogueFamiliesMeta } = await import(
        '@/lib/specimens/catalogueFamilyMetaStore'
      );
      const store = await readCatalogueFamiliesMeta();
      if (store?.families?.length) {
        for (const row of store.families) {
          if (!row.active) continue;
          const key = `${row.regionId}|${row.categoryId}`;
          const list = overrides.get(key) ?? [];
          list.push({
            label: row.label,
            folder: (row.folder ?? '').trim() || row.label,
          });
          overrides.set(key, list);
        }
      }
    } catch {
      /* sin meta */
    }

    // 2) Supabase (si hay tabla y meta vacío)
    if (overrides.size === 0) {
      try {
        const { isSupabaseAdminConfigured, getSupabaseAdmin } = await import(
          '@/lib/supabase/client'
        );
        if (isSupabaseAdminConfigured()) {
          const db = getSupabaseAdmin();
          const { data, error } = await db
            .from('catalogue_nav_families')
            .select('region_id, category_id, label, sort_order, active')
            .eq('active', true)
            .order('sort_order', { ascending: true });
          if (!error && data?.length) {
            for (const row of data as Array<{
              region_id: string;
              category_id: string;
              label: string;
            }>) {
              const key = `${row.region_id}|${row.category_id}`;
              const list = overrides.get(key) ?? [];
              list.push({ label: row.label, folder: row.label });
              overrides.set(key, list);
            }
          }
        }
      } catch {
        /* sin tabla */
      }
    }

    // 3) familyEntriesForScope (meta/DB/bootstrap por scope)
    if (overrides.size === 0) {
      try {
        const { familyEntriesForScope } = await import(
          '@/lib/specimens/catalogueFamilyOverrides'
        );
        const scopes: Array<{ regionId: string; categoryId: string }> = [];
        for (const t of listNodeMediaUploadTargets()) {
          if (t.level === 'familia' && t.regionId && t.categoryId) {
            const key = `${t.regionId}|${t.categoryId}`;
            if (!scopes.some((s) => `${s.regionId}|${s.categoryId}` === key)) {
              scopes.push({ regionId: t.regionId, categoryId: t.categoryId });
            }
          }
        }
        await Promise.all(
          scopes.map(async (s) => {
            const entries = await familyEntriesForScope(s.regionId, s.categoryId);
            if (entries.length) {
              overrides.set(`${s.regionId}|${s.categoryId}`, entries);
            }
          }),
        );
      } catch {
        /* hardcoded */
      }
    }

    if (overrides.size === 0) return listNodeMediaUploadTargets();
    return listNodeMediaUploadTargets(overrides);
  } catch {
    return listNodeMediaUploadTargets();
  }
}

export async function findNodeMediaUploadTargetAsync(
  id: string,
): Promise<NodeMediaUploadTarget | null> {
  const targets = await listNodeMediaUploadTargetsResolved();
  return targets.find((t) => t.id === id) ?? null;
}

export async function isAllowedNodeMediaUploadFolderAsync(
  folder: string,
): Promise<boolean> {
  const { isNodeMediaFolderName } = await import('@/scripts/sync-cloudinary/roots');
  const f = folder.replace(/^\/+|\/+$/g, '');
  if (!f) return false;
  const last = f.split('/').pop() ?? '';
  if (!isNodeMediaFolderName(last)) return false;
  if (f.includes('_PENDING') || /^CATALOGUE/i.test(f) || /^especimenes-secos/i.test(f)) {
    return false;
  }
  const targets = await listNodeMediaUploadTargetsResolved();
  return targets.some((t) => t.cardFolder === f || t.videoFolder === f);
}

export async function assertNodeMediaSlotFolderAsync(
  folder: string,
  slot: 'card' | 'video',
): Promise<void> {
  const { NODE_MEDIA_SLOT } = await import('@/lib/mirror/contract');
  const f = folder.replace(/^\/+|\/+$/g, '');
  const expectedSeg = slot === 'card' ? NODE_MEDIA_SLOT.card : NODE_MEDIA_SLOT.video;
  if (!f.endsWith(`/${expectedSeg}`)) {
    throw new Error(
      `Upload bloqueado: la carpeta debe terminar en «/${expectedSeg}». Recibido: «${f}».`,
    );
  }
  if (!(await isAllowedNodeMediaUploadFolderAsync(f))) {
    throw new Error(
      `Upload bloqueado: «${f}» no está en la lista de nodos canónicos (rubro/región/categoría/familia).`,
    );
  }
}
