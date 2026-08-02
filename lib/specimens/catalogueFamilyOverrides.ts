/**
 * Familias de catálogo editables / regenerativas.
 * Storage: Supabase (si hay tabla) → JSON meta en Cloudinary (industrial, sin SQL).
 * Bootstrap: carpetas Cloudinary o EXPECTED_* solo 1ª vez.
 * Solo Server / API — no importar en client components.
 */
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/client';
import { dropOrphanNumberedFamilyBases } from '@/lib/specimens/catalogueNav';
import {
  DRIED_SPECIMEN_CATEGORY_FOLDERS,
  DRIED_SPECIMEN_REGION_ROOTS,
  beetleFamiliesForRegion,
  butterflyFamiliesForRegion,
  insectFamiliesForRegion,
  isNodeMediaFolderName,
  mothFamiliesForRegion,
  rareGynanFamiliesForRegion,
} from '@/scripts/sync-cloudinary/roots';

export type CatalogueFamilyRow = {
  id: string;
  regionId: string;
  categoryId: string;
  label: string;
  /** Carpeta Cloudinary; por defecto = label. No cambia al renombrar. */
  folder?: string;
  sortOrder: number;
  active: boolean;
};

export type FamilyNavEntry = { label: string; folder: string };

function entryFromRow(r: CatalogueFamilyRow): FamilyNavEntry {
  return { label: r.label, folder: (r.folder ?? '').trim() || r.label };
}

function cloudConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export async function discoverFamiliesFromCloudinary(
  regionId: string,
  categoryId: string,
): Promise<string[]> {
  const root = categoryNodePath(regionId, categoryId);
  if (!root || !cloudConfigured()) return [];
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const res = (await cloudinary.api.sub_folders(root)) as {
      folders?: Array<{ name?: string }>;
    };
    return (res.folders ?? [])
      .map((f) => (f.name ?? '').trim())
      .filter((name) => name && !isNodeMediaFolderName(name))
      .sort((a, b) => a.localeCompare(b, 'en'));
  } catch {
    return [];
  }
}

function tableMissing(msg: string): boolean {
  return (
    /relation|does not exist|PGRST|schema cache|Could not find the table|catalogue_nav_families/i.test(
      msg,
    )
  );
}

function isEphemeralId(id: string): boolean {
  return id.startsWith('default:') || id.startsWith('cloud:');
}

/** Path Cloudinary de la categoría (padre de las carpetas familia). */
export function categoryNodePath(
  regionId: string,
  categoryId: string,
): string | null {
  const reg = DRIED_SPECIMEN_REGION_ROOTS.find((r) => r.id === regionId);
  const cat = DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => c.id === categoryId);
  if (!reg || !cat) return null;
  return `${reg.path}/${cat.segment}`;
}

/** Seed bootstrap (solo 1ª vez si Cloudinary no tiene carpetas aún). */
export function bootstrapFamiliesForScope(
  regionId: string,
  categoryId: string,
): string[] {
  if (categoryId === 'butterflies-lepidoptera-diurne') {
    return [...butterflyFamiliesForRegion(regionId)];
  }
  if (categoryId === 'moths-lepidoptera-nocturne') {
    return [...mothFamiliesForRegion(regionId)];
  }
  if (categoryId === 'insects-arthropoda') {
    return [...insectFamiliesForRegion(regionId)];
  }
  if (categoryId === 'beetles-coleoptera-insects') {
    return [...beetleFamiliesForRegion(regionId)];
  }
  if (categoryId === 'rare-gynan-aberrations') {
    return [...rareGynanFamiliesForRegion(regionId)];
  }
  return [];
}

/** @deprecated usar bootstrapFamiliesForScope */
export const defaultFamiliesForScope = bootstrapFamiliesForScope;

function mapRows(
  rows: Array<{
    id: string;
    region_id: string;
    category_id: string;
    label: string;
    sort_order: number;
    active: boolean;
  }>,
): CatalogueFamilyRow[] {
  return rows.map((r) => ({
    id: r.id,
    regionId: r.region_id,
    categoryId: r.category_id,
    label: r.label,
    folder: r.label,
    sortOrder: r.sort_order,
    active: r.active,
  }));
}

async function fetchDbRows(
  regionId: string,
  categoryId: string,
  includeInactive: boolean,
): Promise<CatalogueFamilyRow[] | null> {
  if (!isSupabaseAdminConfigured()) return null;
  try {
    const db = getSupabaseAdmin();
    let q = db
      .from('catalogue_nav_families')
      .select('id, region_id, category_id, label, sort_order, active')
      .eq('region_id', regionId)
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true });
    if (!includeInactive) q = q.eq('active', true);

    const { data, error } = await q;
    if (error) {
      if (tableMissing(error.message) || tableMissing(JSON.stringify(error))) {
        return null;
      }
      throw new Error(error.message);
    }
    return mapRows(
      (data ?? []) as Array<{
        id: string;
        region_id: string;
        category_id: string;
        label: string;
        sort_order: number;
        active: boolean;
      }>,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (tableMissing(msg)) return null;
    throw e;
  }
}

async function loadMetaStore() {
  return import('@/lib/specimens/catalogueFamilyMetaStore');
}

export async function listCatalogueFamilies(
  regionId: string,
  categoryId: string,
): Promise<CatalogueFamilyRow[]> {
  // 1) Meta Cloudinary primero (renombres libres del admin)
  try {
    const { listMetaFamiliesForScope } = await loadMetaStore();
    const meta = await listMetaFamiliesForScope(regionId, categoryId, false);
    if (meta && meta.length > 0) return meta;
  } catch {
    /* sin meta */
  }

  // 2) Supabase
  try {
    const dbRows = await fetchDbRows(regionId, categoryId, false);
    if (dbRows && dbRows.length > 0) return dbRows;
  } catch {
    /* tabla ausente */
  }

  return bootstrapFamiliesForScope(regionId, categoryId).map((label, i) => ({
    id: `default:${regionId}:${categoryId}:${label}`,
    regionId,
    categoryId,
    label,
    folder: label,
    sortOrder: i,
    active: true,
  }));
}

export async function familyLabelsForScope(
  regionId: string,
  categoryId: string,
): Promise<string[]> {
  const entries = await familyEntriesForScope(regionId, categoryId);
  return entries.map((e) => e.label);
}

/** Label + folder Cloudinary (para CARD/VIDEO y storefront). */
export async function familyEntriesForScope(
  regionId: string,
  categoryId: string,
): Promise<FamilyNavEntry[]> {
  try {
    const rows = await listCatalogueFamilies(regionId, categoryId);
    return dropOrphanNumberedFamilyBases(rows.map(entryFromRow));
  } catch {
    return dropOrphanNumberedFamilyBases(
      bootstrapFamiliesForScope(regionId, categoryId).map((label) => ({
        label,
        folder: label,
      })),
    );
  }
}

export function familyLabelsForScopeSync(
  regionId: string,
  categoryId: string,
): string[] {
  return bootstrapFamiliesForScope(regionId, categoryId);
}

export async function listAllCatalogueFamilyOptions(): Promise<Array<{
  regionId: string;
  categoryId: string;
  label: string;
}> | null> {
  // Meta primero (renombres libres)
  try {
    const { readCatalogueFamiliesMeta } = await loadMetaStore();
    const store = await readCatalogueFamiliesMeta();
    if (store?.families?.length) {
      return store.families
        .filter((f) => f.active)
        .map((f) => ({
          regionId: f.regionId,
          categoryId: f.categoryId,
          label: f.label,
        }));
    }
  } catch {
    /* supabase */
  }

  if (isSupabaseAdminConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const { data, error } = await db
        .from('catalogue_nav_families')
        .select('region_id, category_id, label, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (!error && data?.length) {
        return (
          data as Array<{ region_id: string; category_id: string; label: string }>
        ).map((r) => ({
          regionId: r.region_id,
          categoryId: r.category_id,
          label: r.label,
        }));
      }
    } catch {
      /* null */
    }
  }
  return null;
}

export async function hasCatalogueFamilyOverrides(
  regionId: string,
  categoryId: string,
): Promise<boolean> {
  try {
    const rows = await fetchDbRows(regionId, categoryId, true);
    if (rows && rows.length > 0) return true;
  } catch {
    /* noop */
  }
  try {
    const { listMetaFamiliesForScope } = await loadMetaStore();
    const meta = await listMetaFamiliesForScope(regionId, categoryId, true);
    return Boolean(meta && meta.length > 0);
  } catch {
    return false;
  }
}

export async function listCatalogueFamiliesAdmin(
  regionId: string,
  categoryId: string,
): Promise<CatalogueFamilyRow[]> {
  try {
    const { listMetaFamiliesForScope } = await loadMetaStore();
    const meta = await listMetaFamiliesForScope(regionId, categoryId, true);
    if (meta && meta.length > 0) return meta;
  } catch {
    /* noop */
  }

  try {
    const existing = await fetchDbRows(regionId, categoryId, true);
    if (existing && existing.length > 0) return existing;
  } catch {
    /* noop */
  }

  return listCatalogueFamilies(regionId, categoryId);
}

export async function seedCatalogueFamiliesIfEmpty(
  regionId: string,
  categoryId: string,
  opts?: { forceDiscover?: boolean; allowEmpty?: boolean },
): Promise<{
  seeded: number;
  source: 'cloudinary' | 'bootstrap' | 'none';
  storage: 'supabase' | 'cloudinary-meta';
}> {
  const tryDiscover = opts?.forceDiscover !== false;

  // 1) Supabase table
  if (isSupabaseAdminConfigured()) {
    try {
      const existing = await fetchDbRows(regionId, categoryId, true);
      if (existing && existing.length > 0) {
        return { seeded: 0, source: 'none', storage: 'supabase' };
      }
      const db = getSupabaseAdmin();
      const { count, error: countErr } = await db
        .from('catalogue_nav_families')
        .select('id', { count: 'exact', head: true })
        .eq('region_id', regionId)
        .eq('category_id', categoryId);

      if (!countErr) {
        if ((count ?? 0) > 0) {
          return { seeded: 0, source: 'none', storage: 'supabase' };
        }
        let labels = tryDiscover
          ? await discoverFamiliesFromCloudinary(regionId, categoryId)
          : [];
        let source: 'cloudinary' | 'bootstrap' | 'none' = 'cloudinary';
        if (labels.length === 0) {
          labels = bootstrapFamiliesForScope(regionId, categoryId);
          source = labels.length > 0 ? 'bootstrap' : 'none';
        }
        if (labels.length > 0) {
          const { error } = await db.from('catalogue_nav_families').insert(
            labels.map((label, i) => ({
              region_id: regionId,
              category_id: categoryId,
              label,
              sort_order: i,
              active: true,
            })),
          );
          if (!error) {
            return { seeded: labels.length, source, storage: 'supabase' };
          }
          if (!tableMissing(error.message)) throw new Error(error.message);
        }
      } else if (!tableMissing(countErr.message)) {
        throw new Error(countErr.message);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!tableMissing(msg)) {
        // seguir a meta
      }
    }
  }

  // 2) Cloudinary JSON meta (sin SQL)
  const { listMetaFamiliesForScope, upsertMetaScope, newMetaFamilyId } =
    await loadMetaStore();
  const existingMeta = await listMetaFamiliesForScope(regionId, categoryId, true);
  if (existingMeta && existingMeta.length > 0) {
    return { seeded: 0, source: 'none', storage: 'cloudinary-meta' };
  }

  let labels = tryDiscover
    ? await discoverFamiliesFromCloudinary(regionId, categoryId)
    : [];
  let source: 'cloudinary' | 'bootstrap' | 'none' = 'cloudinary';
  if (labels.length === 0) {
    labels = bootstrapFamiliesForScope(regionId, categoryId);
    source = labels.length > 0 ? 'bootstrap' : 'none';
  }
  if (labels.length === 0) {
    return { seeded: 0, source: 'none', storage: 'cloudinary-meta' };
  }

  await upsertMetaScope(
    regionId,
    categoryId,
    labels.map((label, i) => ({
      id: newMetaFamilyId(),
      regionId,
      categoryId,
      label,
      folder: label,
      sortOrder: i,
      active: true,
    })),
  );
  return { seeded: labels.length, source, storage: 'cloudinary-meta' };
}

async function ensurePersistedScope(
  regionId: string,
  categoryId: string,
): Promise<{ storage: 'supabase' | 'cloudinary-meta' }> {
  const rows = await listCatalogueFamiliesAdmin(regionId, categoryId);
  if (rows.length > 0 && rows.every((r) => !isEphemeralId(r.id))) {
    const db = await fetchDbRows(regionId, categoryId, true);
    return { storage: db && db.length > 0 ? 'supabase' : 'cloudinary-meta' };
  }
  const r = await seedCatalogueFamiliesIfEmpty(regionId, categoryId, {
    forceDiscover: false,
    allowEmpty: true,
  });
  return { storage: r.storage };
}

export async function resyncFamiliesFromCloudinary(
  regionId: string,
  categoryId: string,
): Promise<{ synced: number }> {
  const labels = await discoverFamiliesFromCloudinary(regionId, categoryId);
  if (labels.length === 0) {
    throw new Error(
      'Cloudinary no devolvió subcarpetas. Revisá el path o creá familias a mano.',
    );
  }

  await ensurePersistedScope(regionId, categoryId);
  const dbRows = await fetchDbRows(regionId, categoryId, true);
  if (dbRows) {
    const db = getSupabaseAdmin();
    const byLabel = new Map(dbRows.map((r) => [r.label, r]));
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const hit = byLabel.get(label);
      if (hit) {
        await db
          .from('catalogue_nav_families')
          .update({
            sort_order: i,
            active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', hit.id);
        byLabel.delete(label);
      } else {
        await db.from('catalogue_nav_families').insert({
          region_id: regionId,
          category_id: categoryId,
          label,
          sort_order: i,
          active: true,
        });
      }
    }
    for (const left of byLabel.values()) {
      await db
        .from('catalogue_nav_families')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', left.id);
    }
    return { synced: labels.length };
  }

  const { upsertMetaScope, newMetaFamilyId, listMetaFamiliesForScope } =
    await loadMetaStore();
  const prev = (await listMetaFamiliesForScope(regionId, categoryId, true)) ?? [];
  const byLabel = new Map(prev.map((r) => [r.label, r]));
  const next = labels.map((label, i) => {
    const hit = byLabel.get(label);
    byLabel.delete(label);
    return {
      id: hit?.id ?? newMetaFamilyId(),
      regionId,
      categoryId,
      label,
      folder: hit?.folder ?? label,
      sortOrder: i,
      active: true,
    };
  });
  for (const left of byLabel.values()) {
    next.push({
      ...left,
      folder: left.folder ?? left.label,
      active: false,
      sortOrder: next.length,
    });
  }
  await upsertMetaScope(regionId, categoryId, next);
  return { synced: labels.length };
}

export async function createCatalogueFamily(input: {
  regionId: string;
  categoryId: string;
  label: string;
}): Promise<CatalogueFamilyRow> {
  const label = input.label.trim();
  if (!label) throw new Error('Nombre de familia vacío.');

  const { storage } = await ensurePersistedScope(input.regionId, input.categoryId);

  if (storage === 'supabase' && isSupabaseAdminConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const { data: maxRow } = await db
        .from('catalogue_nav_families')
        .select('sort_order')
        .eq('region_id', input.regionId)
        .eq('category_id', input.categoryId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const sortOrder =
        typeof maxRow?.sort_order === 'number' ? maxRow.sort_order + 1 : 0;
      const { data, error } = await db
        .from('catalogue_nav_families')
        .insert({
          region_id: input.regionId,
          category_id: input.categoryId,
          label,
          sort_order: sortOrder,
          active: true,
        })
        .select('id, region_id, category_id, label, sort_order, active')
        .single();
      if (!error && data) {
        return {
          id: data.id,
          regionId: data.region_id,
          categoryId: data.category_id,
          label: data.label,
          sortOrder: data.sort_order,
          active: data.active,
        };
      }
      if (error && !tableMissing(error.message)) throw new Error(error.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!tableMissing(msg)) throw e;
    }
  }

  const { listMetaFamiliesForScope, upsertMetaScope, newMetaFamilyId } =
    await loadMetaStore();
  const current =
    (await listMetaFamiliesForScope(input.regionId, input.categoryId, true)) ??
    [];
  const row: CatalogueFamilyRow = {
    id: newMetaFamilyId(),
    regionId: input.regionId,
    categoryId: input.categoryId,
    label,
    folder: label,
    sortOrder: current.length,
    active: true,
  };
  await upsertMetaScope(input.regionId, input.categoryId, [...current, row]);
  return row;
}

export async function updateCatalogueFamily(input: {
  id: string;
  label?: string;
  /** Solo si hace falta alinear carpeta media (raro). */
  folder?: string;
  active?: boolean;
  sortOrder?: number;
}): Promise<CatalogueFamilyRow> {
  if (isEphemeralId(input.id)) {
    throw new Error('Lista aún no guardada. Tocá «Activar edición» primero.');
  }

  // Supabase UUID (no meta:)
  if (!input.id.startsWith('meta:') && isSupabaseAdminConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.label != null) {
        const label = input.label.trim();
        if (!label) throw new Error('Nombre vacío.');
        patch.label = label;
      }
      if (input.active != null) patch.active = input.active;
      if (input.sortOrder != null) patch.sort_order = input.sortOrder;
      const { data, error } = await db
        .from('catalogue_nav_families')
        .update(patch)
        .eq('id', input.id)
        .select('id, region_id, category_id, label, sort_order, active')
        .single();
      if (!error && data) {
        return {
          id: data.id,
          regionId: data.region_id,
          categoryId: data.category_id,
          label: data.label,
          sortOrder: data.sort_order,
          active: data.active,
        };
      }
      if (error && !tableMissing(error.message)) throw new Error(error.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!tableMissing(msg) && !/0 rows|PGRST116/i.test(msg)) throw e;
    }
  }

  const { readCatalogueFamiliesMeta, writeCatalogueFamiliesMeta } =
    await loadMetaStore();
  const store = await readCatalogueFamiliesMeta();
  if (!store) throw new Error('No hay store de familias. Tocá «Activar edición».');
  const idx = store.families.findIndex((f) => f.id === input.id);
  if (idx < 0) throw new Error('Familia no encontrada.');
  const row = { ...store.families[idx] };
  if (input.label != null) {
    const label = input.label.trim();
    if (!label) throw new Error('Nombre vacío.');
    row.label = label;
  }
  // folder solo si se pide explícito; renombrar no mueve carpeta media
  if (input.folder != null) {
    const folder = input.folder.trim();
    if (!folder) throw new Error('Carpeta media vacía.');
    row.folder = folder;
  } else if (!row.folder) {
    row.folder = row.label;
  }
  if (input.active != null) row.active = input.active;
  if (input.sortOrder != null) row.sortOrder = input.sortOrder;
  const next = [...store.families];
  next[idx] = row;
  await writeCatalogueFamiliesMeta(next);
  return row;
}

/** Mueve una familia a otra región y/o categoría (mismo rubro secos u otro scope). */
export async function relocateCatalogueFamily(input: {
  id: string;
  targetRegionId: string;
  targetCategoryId: string;
}): Promise<CatalogueFamilyRow> {
  if (isEphemeralId(input.id)) {
    throw new Error('Lista aún no guardada. Tocá «Activar edición» primero.');
  }
  const targetRegionId = input.targetRegionId.trim();
  const targetCategoryId = input.targetCategoryId.trim();
  if (!targetRegionId || !targetCategoryId) {
    throw new Error('Región y categoría destino obligatorias.');
  }

  await ensurePersistedScope(targetRegionId, targetCategoryId);

  if (!input.id.startsWith('meta:') && isSupabaseAdminConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const { data: maxRow } = await db
        .from('catalogue_nav_families')
        .select('sort_order')
        .eq('region_id', targetRegionId)
        .eq('category_id', targetCategoryId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const sortOrder =
        typeof maxRow?.sort_order === 'number' ? maxRow.sort_order + 1 : 0;
      const { data, error } = await db
        .from('catalogue_nav_families')
        .update({
          region_id: targetRegionId,
          category_id: targetCategoryId,
          sort_order: sortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select('id, region_id, category_id, label, sort_order, active')
        .single();
      if (!error && data) {
        return {
          id: data.id,
          regionId: data.region_id,
          categoryId: data.category_id,
          label: data.label,
          sortOrder: data.sort_order,
          active: data.active,
        };
      }
      if (error && !tableMissing(error.message)) throw new Error(error.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!tableMissing(msg) && !/0 rows|PGRST116/i.test(msg)) throw e;
    }
  }

  const { readCatalogueFamiliesMeta, writeCatalogueFamiliesMeta } =
    await loadMetaStore();
  const store = await readCatalogueFamiliesMeta();
  if (!store) throw new Error('No hay store de familias. Tocá «Activar edición».');
  const idx = store.families.findIndex((f) => f.id === input.id);
  if (idx < 0) throw new Error('Familia no encontrada.');
  const targetList =
    store.families.filter(
      (f) =>
        f.regionId === targetRegionId &&
        f.categoryId === targetCategoryId &&
        f.id !== input.id,
    ) ?? [];
  const row = {
    ...store.families[idx],
    regionId: targetRegionId,
    categoryId: targetCategoryId,
    sortOrder: targetList.length,
  };
  const next = [...store.families];
  next[idx] = row;
  await writeCatalogueFamiliesMeta(next);
  return row;
}

/** Borrado permanente de la ficha taxonómica de familia (no toca Cloudinary media). */
export async function deleteCatalogueFamilyHard(
  id: string,
): Promise<{ regionId: string; categoryId: string }> {
  if (isEphemeralId(id)) {
    throw new Error('Lista aún no guardada. Tocá «Activar edición» primero.');
  }

  if (!id.startsWith('meta:') && isSupabaseAdminConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const { data: existing, error: readErr } = await db
        .from('catalogue_nav_families')
        .select('id, region_id, category_id')
        .eq('id', id)
        .maybeSingle();
      if (readErr && !tableMissing(readErr.message)) throw new Error(readErr.message);
      if (existing) {
        const { error } = await db.from('catalogue_nav_families').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return {
          regionId: existing.region_id as string,
          categoryId: existing.category_id as string,
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!tableMissing(msg) && !/0 rows|PGRST116/i.test(msg)) throw e;
    }
  }

  const { readCatalogueFamiliesMeta, writeCatalogueFamiliesMeta } =
    await loadMetaStore();
  const store = await readCatalogueFamiliesMeta();
  if (!store) throw new Error('Familia no encontrada.');
  const row = store.families.find((f) => f.id === id);
  if (!row) throw new Error('Familia no encontrada.');
  await writeCatalogueFamiliesMeta(store.families.filter((f) => f.id !== id));
  return { regionId: row.regionId, categoryId: row.categoryId };
}

export async function reorderCatalogueFamilies(
  regionId: string,
  categoryId: string,
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.some(isEphemeralId)) {
    await seedCatalogueFamiliesIfEmpty(regionId, categoryId, {
      forceDiscover: false,
    });
  }

  const adminRows = await listCatalogueFamiliesAdmin(regionId, categoryId);
  if (adminRows.some((r) => isEphemeralId(r.id))) {
    await seedCatalogueFamiliesIfEmpty(regionId, categoryId, {
      forceDiscover: false,
    });
  }

  const persisted = await listCatalogueFamiliesAdmin(regionId, categoryId);
  if (persisted.every((r) => !r.id.startsWith('meta:') && !isEphemeralId(r.id))) {
    if (isSupabaseAdminConfigured()) {
      try {
        const db = getSupabaseAdmin();
        const ids =
          orderedIds.some(isEphemeralId) || orderedIds.some((id) => id.startsWith('meta:'))
            ? persisted.map((r) => r.id)
            : orderedIds;
        // Map by current labels order if ids were remapped after seed
        const useIds =
          ids.length === orderedIds.length
            ? orderedIds.every((id) => persisted.some((p) => p.id === id))
              ? orderedIds
              : persisted
                  .sort((a, b) => {
                    const ia = orderedIds.indexOf(a.id);
                    const ib = orderedIds.indexOf(b.id);
                    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
                  })
                  .map((r) => r.id)
            : persisted.map((r) => r.id);

        let ok = true;
        for (let i = 0; i < useIds.length; i++) {
          const { error } = await db
            .from('catalogue_nav_families')
            .update({ sort_order: i, updated_at: new Date().toISOString() })
            .eq('id', useIds[i])
            .eq('region_id', regionId)
            .eq('category_id', categoryId);
          if (error) {
            ok = false;
            break;
          }
        }
        if (ok) return;
      } catch {
        /* meta */
      }
    }
  }

  const { listMetaFamiliesForScope, upsertMetaScope } = await loadMetaStore();
  let current =
    (await listMetaFamiliesForScope(regionId, categoryId, true)) ?? [];
  if (current.length === 0) {
    await seedCatalogueFamiliesIfEmpty(regionId, categoryId, {
      forceDiscover: false,
    });
    current =
      (await listMetaFamiliesForScope(regionId, categoryId, true)) ?? [];
  }

  const byId = new Map(current.map((r) => [r.id, r]));
  const ordered: CatalogueFamilyRow[] = [];
  for (const id of orderedIds) {
    const hit = byId.get(id);
    if (hit) {
      ordered.push(hit);
      byId.delete(id);
    }
  }
  for (const left of byId.values()) ordered.push(left);
  await upsertMetaScope(regionId, categoryId, ordered);
}

export async function bootstrapAllCatalogueFamilies(): Promise<{
  scopes: number;
  seeded: number;
}> {
  let scopes = 0;
  let seeded = 0;
  for (const reg of DRIED_SPECIMEN_REGION_ROOTS) {
    for (const cat of DRIED_SPECIMEN_CATEGORY_FOLDERS) {
      scopes += 1;
      const r = await seedCatalogueFamiliesIfEmpty(reg.id, cat.id, {
        forceDiscover: false,
        allowEmpty: true,
      });
      seeded += r.seeded;
    }
  }
  return { scopes, seeded };
}
