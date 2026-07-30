// ============================================================================
// Sync bidireccional Cloudinary ↔ Supabase (espejo industrial).
//
// REGLA: nunca crear carpetas fuera del árbol entomológico canónico
//   RUBROS/…/REGION Central  South America Neotropical/…
// Cloud → DB: upsert specimen_media solo desde path canónico
// Fuera de sitio → ORPHAN / reportar (misplacedSamples); no borrar Cloud
// DB → Cloud: NUNCA (no _PENDING, no placeholders, no “arreglar” paths)
// ============================================================================

import { v2 as cloudinary } from 'cloudinary';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  classifyPublicIdPlacement,
  extractPublicId,
  isCanonicalCataloguePublicId,
  isCataloguePublicId,
  isMisplacedInventoryPublicId,
  isNodeMediaPublicId,
  MIRROR_CATALOGUE_PREFIXES,
  MIRROR_MISPLACED_SCAN_PREFIXES,
  type MediaSyncStatus,
  type SpecimenMirrorStatus,
} from './contract';

/** Configura Cloudinary en runtime (no al import: el CLI carga .env después). */
function ensureCloudinaryConfig(): void {
  const cloud_name =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'Faltan CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en el entorno',
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export type MirrorMode = 'discover' | 'apply';

export type MirrorSchemaGap = {
  table: string;
  missing: string[];
  note: string;
};

export type MirrorSyncResult = {
  ok: boolean;
  mode: MirrorMode;
  cloudScanned: number;
  dbScanned: number;
  upsertedMedia: number;
  createdCloud: number;
  placeholders: number;
  orphansCloud: number;
  orphansDb: number;
  specimensTouched: number;
  /** Filas DB borradas porque el public_id ya no existe en Cloudinary */
  cleanedDeadRefs: number;
  /** Filas UI/brand quitadas de specimen_media (no son catálogo) */
  removedNonCatalogue: number;
  /** Assets Cloudinary fuera del árbol canónico REGION… (no se borran) */
  misplacedCloud: number;
  errors: { context: string; message: string }[];
  schemaGaps: MirrorSchemaGap[];
  /** Muestra de public_ids muertos limpios (máx 20) */
  deadRefSamples: string[];
  /** Muestra public_ids fuera de lugar (máx 40) — limpieza manual */
  misplacedSamples: string[];
  runId?: string;
  syncedAt: string;
};

type DbMedia = {
  id: string;
  specimen_id: string | null;
  public_id: string | null;
  media_url: string | null;
  media_type: string | null;
  sync_status?: string | null;
};

type DbSpecimen = {
  id: string;
  species_name: string | null;
  media_url: string | null;
  cloudinary_public_id: string | null;
  specimen_code?: string | null;
  rubro?: string | null;
};

type CloudAsset = {
  publicId: string;
  secureUrl: string;
  resourceType: 'image' | 'video' | 'raw';
  folder: string | null;
};

/**
 * PNG 1×1 — DESACTIVADO. No crear placeholders ni carpetas _PENDING.
 * Cloudinary = fuente de verdad; Supabase checklist; entomólogo limpia a mano.
 */

function softColError(message: string): boolean {
  return /column .* does not exist|Could not find/i.test(message);
}

async function cloudExists(publicId: string): Promise<CloudAsset | null> {
  for (const rt of ['image', 'video', 'raw'] as const) {
    try {
      const res = await cloudinary.api.resource(publicId, { resource_type: rt });
      return {
        publicId: String(res.public_id),
        secureUrl: String(res.secure_url),
        resourceType: rt,
        folder: (res.folder as string | undefined) ?? null,
      };
    } catch {
      // next type
    }
  }
  return null;
}

async function listPrefixAssets(
  prefixes: readonly string[],
  maxPerPrefix: number,
  seen: Set<string>,
): Promise<CloudAsset[]> {
  const out: CloudAsset[] = [];
  for (const prefix of prefixes) {
    let nextCursor: string | undefined;
    let guard = 0;
    do {
      guard += 1;
      if (guard > 20) break;
      try {
        const page = await cloudinary.api.resources({
          type: 'upload',
          resource_type: 'image',
          prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
          max_results: Math.min(100, maxPerPrefix),
          next_cursor: nextCursor,
        });
        for (const r of page.resources ?? []) {
          const pid = String(r.public_id);
          if (seen.has(pid)) continue;
          seen.add(pid);
          out.push({
            publicId: pid,
            secureUrl: String(r.secure_url),
            resourceType: 'image',
            folder: (r.folder as string | undefined) ?? null,
          });
        }
        nextCursor = page.next_cursor as string | undefined;
        if (out.filter((a) => a.publicId.startsWith(prefix)).length >= maxPerPrefix) break;
      } catch (e) {
        if (String(e).includes('Rate Limit')) throw e;
        break;
      }
    } while (nextCursor);
  }
  return out;
}

/** Solo inventario bajo REGION canónica. No crea carpetas. */
async function listCatalogueAssets(maxPerPrefix = 200): Promise<CloudAsset[]> {
  const seen = new Set<string>();
  return listPrefixAssets(MIRROR_CATALOGUE_PREFIXES, maxPerPrefix, seen);
}

/**
 * Assets fuera del árbol canónico (legacy / raíz / _PENDING).
 * Solo reportar — NUNCA borrar en Cloudinary ni crear carpetas para “arreglar”.
 */
async function listMisplacedAssets(maxPerPrefix = 100): Promise<CloudAsset[]> {
  const seen = new Set<string>();
  const out = await listPrefixAssets(MIRROR_MISPLACED_SCAN_PREFIXES, maxPerPrefix, seen);

  // Raíz suelta (Morpho_… sin carpeta)
  try {
    let nextCursor: string | undefined;
    let guard = 0;
    do {
      guard += 1;
      if (guard > 5) break;
      const root = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        max_results: 100,
        next_cursor: nextCursor,
      });
      for (const r of root.resources ?? []) {
        const pid = String(r.public_id);
        if (pid.includes('/')) continue;
        if (!isMisplacedInventoryPublicId(pid)) continue;
        if (seen.has(pid)) continue;
        seen.add(pid);
        out.push({
          publicId: pid,
          secureUrl: String(r.secure_url),
          resourceType: 'image',
          folder: null,
        });
      }
      nextCursor = root.next_cursor as string | undefined;
    } while (nextCursor);
  } catch {
    // ignore
  }

  return out.filter((a) => !isCanonicalCataloguePublicId(a.publicId));
}

const MEDIA_SELECT_FULL =
  'id, specimen_id, public_id, media_url, media_type, sync_status, is_placeholder, cloudinary_exists';
const MEDIA_SELECT_BASE = 'id, specimen_id, public_id, media_url, media_type';

async function loadMediaRows(db: SupabaseClient): Promise<DbMedia[]> {
  const full = await db.from('specimen_media').select(MEDIA_SELECT_FULL).limit(2000);
  if (!full.error) return (full.data ?? []) as DbMedia[];
  if (!softColError(full.error.message)) throw full.error;
  const base = await db.from('specimen_media').select(MEDIA_SELECT_BASE).limit(2000);
  if (base.error) throw base.error;
  return (base.data ?? []) as DbMedia[];
}

/** Detecta columnas de espejo aún no aplicadas en live (vía probe de select). */
async function probeSchemaGaps(db: SupabaseClient): Promise<MirrorSchemaGap[]> {
  const gaps: MirrorSchemaGap[] = [];

  const probe = async (table: string, cols: string[], note: string) => {
    const missing: string[] = [];
    for (const col of cols) {
      const { error } = await db.from(table).select(col).limit(1);
      if (error && softColError(error.message)) missing.push(col);
    }
    if (missing.length) gaps.push({ table, missing, note });
  };

  await probe(
    'specimen_media',
    ['sync_status', 'cloudinary_exists', 'is_placeholder', 'last_synced_at', 'mirror_notes'],
    'Corre sección C de espejo_universal_industrial.sql',
  );
  await probe(
    'specimens',
    ['mirror_status', 'last_mirror_at', 'specimen_code', 'attributes', 'metadata'],
    'Corre sección B de espejo_universal_industrial.sql',
  );
  await probe(
    'campaigns',
    ['title', 'active', 'starts_at', 'ends_at', 'banner'],
    'Corre sección D de espejo_universal_industrial.sql',
  );
  await probe(
    'shipments',
    ['shipment_code', 'shipment_type', 'status', 'destination_country'],
    'Corre delta_align_admin_stubs.sql',
  );
  {
    const { error } = await db.from('mirror_sync_runs').select('id').limit(1);
    if (error) {
      gaps.push({
        table: 'mirror_sync_runs',
        missing: ['(tabla ausente)'],
        note: 'Corre sección E de espejo_universal_industrial.sql',
      });
    }
  }

  return gaps;
}

async function updateMediaRow(
  db: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from('specimen_media').update(patch).eq('id', id);
  if (error && !softColError(error.message)) throw error;
}

async function upsertMediaByPublicId(
  db: SupabaseClient,
  row: {
    specimen_id: string | null;
    public_id: string;
    media_url: string;
    media_type: string;
    sync_status: MediaSyncStatus;
    cloudinary_exists: boolean;
    is_placeholder?: boolean;
    display_order?: number;
  },
): Promise<'inserted' | 'updated'> {
  const existing = await db
    .from('specimen_media')
    .select('id')
    .eq('public_id', row.public_id)
    .maybeSingle();

  const payload = {
    specimen_id: row.specimen_id,
    public_id: row.public_id,
    media_url: row.media_url,
    media_type: row.media_type,
    sync_status: row.sync_status,
    cloudinary_exists: row.cloudinary_exists,
    is_placeholder: row.is_placeholder ?? false,
    last_synced_at: new Date().toISOString(),
    display_order: row.display_order ?? 0,
  };

  if (existing.data?.id) {
    const { error } = await db.from('specimen_media').update(payload).eq('id', existing.data.id);
    if (error) {
      // Fallback si columnas de mirror aún no existen
      if (softColError(error.message)) {
        const { error: e2 } = await db
          .from('specimen_media')
          .update({
            specimen_id: row.specimen_id,
            media_url: row.media_url,
            media_type: row.media_type,
            display_order: row.display_order ?? 0,
          })
          .eq('id', existing.data.id);
        if (e2) throw e2;
      } else throw error;
    }
    return 'updated';
  }

  const { error } = await db.from('specimen_media').insert(payload);
  if (error) {
    if (softColError(error.message)) {
      const { error: e2 } = await db.from('specimen_media').insert({
        specimen_id: row.specimen_id,
        public_id: row.public_id,
        media_url: row.media_url,
        media_type: row.media_type,
        display_order: row.display_order ?? 0,
      });
      if (e2) throw e2;
    } else throw error;
  }
  return 'inserted';
}

async function patchSpecimenMirror(
  db: SupabaseClient,
  specimenId: string,
  patch: {
    mirror_status?: SpecimenMirrorStatus;
    cloudinary_public_id?: string;
    media_url?: string;
  },
  opts: { overwriteCover?: boolean } = {},
): Promise<void> {
  // No pisar cover existente salvo overwrite explícito
  if (!opts.overwriteCover && (patch.cloudinary_public_id || patch.media_url)) {
    const cur = await db
      .from('specimens')
      .select('cloudinary_public_id, media_url')
      .eq('id', specimenId)
      .maybeSingle();
    const hasCover =
      Boolean(cur.data?.cloudinary_public_id) || Boolean(cur.data?.media_url);
    if (hasCover) {
      const { cloudinary_public_id: _c, media_url: _m, ...rest } = patch;
      patch = rest;
      if (!Object.keys(patch).length) return;
    }
  }

  const full = {
    ...patch,
    last_mirror_at: new Date().toISOString(),
  };
  const { error } = await db.from('specimens').update(full).eq('id', specimenId);
  if (error && softColError(error.message)) {
    // Solo media_url / cloudinary_public_id si mirror cols no existen
    const slim: Record<string, unknown> = {};
    if (patch.media_url) slim.media_url = patch.media_url;
    if (patch.cloudinary_public_id) slim.cloudinary_public_id = patch.cloudinary_public_id;
    if (Object.keys(slim).length) {
      await db.from('specimens').update(slim).eq('id', specimenId);
    }
  } else if (error) {
    throw error;
  }
}

/**
 * Intenta asociar un public_id huérfano de Cloudinary a un specimen existente
 * por coincidencia de species_name / fragmento del public_id.
 */
async function findSpecimenForAsset(
  db: SupabaseClient,
  publicId: string,
): Promise<string | null> {
  const leaf = publicId.split('/').pop() ?? publicId;
  const guess = leaf
    .replace(/_/g, ' ')
    .replace(/\b(dorsal|ventral|reverso|anverso|copia de|copia_de)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (guess.length < 4) return null;

  const { data } = await db
    .from('specimens')
    .select('id, species_name')
    .ilike('species_name', `%${guess.split(' ').slice(0, 2).join(' ')}%`)
    .limit(5);

  if (data && data.length === 1) return data[0].id as string;
  return null;
}

/**
 * Extrae rubro / región / familia / género / especie desde public_id o
 * asset_folder estilo Media Library:
 *   RUBROS / ESPECIMENS… / REGION… / Butterflies… / Satyridae / Genus / …
 */
function taxonomyFromPublicId(publicId: string): {
  rubro?: string;
  region?: string;
  familia?: string;
  genero?: string;
  especie?: string;
} {
  const parts = publicId.split('/').filter(Boolean);
  // CATALOGUE_Butterflies/GENERAL/Caligo/Caligo_eurilochus_livius
  if (parts[0] === 'CATALOGUE_Butterflies' && parts.length >= 3) {
    const rubro = parts[1];
    const leaf = parts[parts.length - 1];
    const genero = parts.length >= 4 ? parts[2] : leaf.split('_')[0];
    return { rubro, genero, especie: leaf.replace(/_/g, ' ') };
  }
  if (parts[0] === 'especimenes-secos') {
    return { rubro: 'ESPECIMENES_SECOS' };
  }
  if (parts[0] === 'RUBROS') {
    const out: {
      rubro?: string;
      region?: string;
      familia?: string;
      genero?: string;
      especie?: string;
    } = {
      rubro: parts[1] ?? 'RUBROS',
    };
    for (const seg of parts) {
      const regionMatch = seg.match(/^regi[oó]n[\s_-]+(.+)$/i);
      if (regionMatch) out.region = regionMatch[1].trim();
      const famToken = seg.split(/[\s_]+/)[0] ?? '';
      if (/^[a-z]+idae$/i.test(famToken)) {
        out.familia = famToken.charAt(0).toUpperCase() + famToken.slice(1).toLowerCase();
      }
    }
    const leaf = parts[parts.length - 1] ?? '';
    const leafBits = leaf.split(/[_\s]+/).filter(Boolean);
    if (leafBits.length >= 2 && /^[A-ZÀ-Ý]/.test(leafBits[0])) {
      out.genero = leafBits[0];
      out.especie = leafBits.slice(0, 3).join(' ');
    } else if (parts.length >= 2) {
      const maybeGenus = parts[parts.length - 2];
      if (maybeGenus && /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(maybeGenus)) {
        out.genero = maybeGenus;
        out.especie = `${maybeGenus} ${leaf.replace(/_/g, ' ')}`;
      }
    }
    return out;
  }
  return {};
}

export async function runBidirectionalMirror(
  db: SupabaseClient,
  opts: {
    mode: MirrorMode;
    triggeredBy?: string;
    maxCloud?: number;
    /** Por defecto false: Cloudinary es fuente de verdad; no inventar assets. */
    createCloudAssets?: boolean;
  } = { mode: 'discover' },
): Promise<MirrorSyncResult> {
  const mode = opts.mode;
  // createCloudAssets ignorado: nunca crear en Cloud desde el espejo
  void opts.createCloudAssets;
  const errors: MirrorSyncResult['errors'] = [];
  let upsertedMedia = 0;
  let orphansCloud = 0;
  let orphansDb = 0;
  let specimensTouched = 0;
  let cleanedDeadRefs = 0;
  let removedNonCatalogue = 0;
  let misplacedCloud = 0;
  const deadRefSamples: string[] = [];
  const misplacedSamples: string[] = [];
  let runId: string | undefined;

  const startedAt = new Date().toISOString();

  const emptyResult = (msg?: string): MirrorSyncResult => ({
    ok: !msg,
    mode,
    cloudScanned: 0,
    dbScanned: 0,
    upsertedMedia: 0,
    createdCloud: 0,
    placeholders: 0,
    orphansCloud: 0,
    orphansDb: 0,
    specimensTouched: 0,
    cleanedDeadRefs: 0,
    removedNonCatalogue: 0,
    misplacedCloud: 0,
    errors: msg ? [{ context: 'cloudinary.config', message: msg }] : [],
    schemaGaps: [],
    deadRefSamples: [],
    misplacedSamples: [],
    syncedAt: new Date().toISOString(),
  });

  try {
    ensureCloudinaryConfig();
  } catch (e) {
    return emptyResult(e instanceof Error ? e.message : String(e));
  }

  const schemaGaps = await probeSchemaGaps(db);

  if (mode === 'apply') {
    const { data: run } = await db
      .from('mirror_sync_runs')
      .insert({
        mode,
        triggered_by: opts.triggeredBy ?? 'api',
        started_at: startedAt,
      })
      .select('id')
      .maybeSingle();
    runId = run?.id as string | undefined;
  }

  // ── A. Cloudinary → DB (solo árbol canónico REGION…) ────────────────────
  let cloudAssets: CloudAsset[] = [];
  try {
    cloudAssets = await listCatalogueAssets(opts.maxCloud ?? 300);
  } catch (e) {
    errors.push({ context: 'listCatalogueAssets', message: e instanceof Error ? e.message : String(e) });
  }

  // ── A2. Fuera de lugar: reportar, no crear carpetas, no borrar Cloud ─────
  let misplacedAssets: CloudAsset[] = [];
  try {
    misplacedAssets = await listMisplacedAssets(80);
  } catch (e) {
    errors.push({ context: 'listMisplacedAssets', message: e instanceof Error ? e.message : String(e) });
  }
  misplacedCloud = misplacedAssets.length;
  for (const a of misplacedAssets) {
    if (misplacedSamples.length < 40) misplacedSamples.push(a.publicId);
  }

  const cloudByPid = new Map(cloudAssets.map((a) => [a.publicId, a]));
  for (const a of misplacedAssets) {
    if (!cloudByPid.has(a.publicId)) cloudByPid.set(a.publicId, a);
  }

  for (const asset of cloudAssets) {
    if (!isCanonicalCataloguePublicId(asset.publicId)) continue;
    // `_card` / `_video`: media de nodo storefront — no inventariar como espécimen.
    if (isNodeMediaPublicId(asset.publicId)) continue;
    try {
      const existing = await db
        .from('specimen_media')
        .select('id, specimen_id')
        .eq('public_id', asset.publicId)
        .maybeSingle();

      const specimenId =
        (existing.data?.specimen_id as string | null) ??
        (await findSpecimenForAsset(db, asset.publicId));

      if (!specimenId) {
        orphansCloud += 1;
      }

      if (mode === 'apply') {
        await upsertMediaByPublicId(db, {
          specimen_id: specimenId,
          public_id: asset.publicId,
          media_url: asset.secureUrl,
          media_type: 'image',
          sync_status: specimenId ? 'MIRRORED' : 'ORPHAN_CLOUD',
          cloudinary_exists: true,
        });
        upsertedMedia += 1;

        if (specimenId) {
          const tax = taxonomyFromPublicId(asset.publicId);
          const slimTax: Record<string, unknown> = {};
          if (tax.rubro) slimTax.rubro = tax.rubro;
          if (tax.region) slimTax.region = tax.region;
          if (tax.familia) slimTax.familia = tax.familia;
          if (tax.genero) slimTax.genero = tax.genero;
          if (tax.especie) slimTax.especie = tax.especie;
          if (Object.keys(slimTax).length) {
            await db.from('specimens').update(slimTax).eq('id', specimenId);
          }
          await patchSpecimenMirror(
            db,
            specimenId,
            {
              mirror_status: 'MIRRORED',
              cloudinary_public_id: asset.publicId,
              media_url: asset.secureUrl,
            },
            { overwriteCover: false },
          );
          specimensTouched += 1;
        }
      }
    } catch (e) {
      errors.push({
        context: `cloud→db ${asset.publicId}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Misplaced: marcar ORPHAN_CLOUD en DB si ya hay fila; no inventar carpetas
  for (const asset of misplacedAssets) {
    orphansCloud += 1;
    if (mode !== 'apply') continue;
    try {
      const existing = await db
        .from('specimen_media')
        .select('id, specimen_id')
        .eq('public_id', asset.publicId)
        .maybeSingle();
      if (existing.data?.id) {
        await updateMediaRow(db, existing.data.id as string, {
          sync_status: 'ORPHAN_CLOUD' satisfies MediaSyncStatus,
          cloudinary_exists: true,
          mirror_notes: 'fuera_de_lugar_no_canonical_REGION',
          last_synced_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      errors.push({
        context: `misplaced ${asset.publicId}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ── B. Limpiar DB: muertos + no-catálogo (Cloudinary manda) ──────────────
  let mediaRows: DbMedia[] = [];
  try {
    mediaRows = await loadMediaRows(db);
  } catch (e) {
    errors.push({
      context: 'list specimen_media',
      message: e instanceof Error ? e.message : String(e),
    });
  }

  for (const row of mediaRows) {
    const pid = extractPublicId(row.public_id) ?? extractPublicId(row.media_url);
    if (!pid) {
      orphansDb += 1;
      if (mode === 'apply') {
        await db.from('specimen_media').delete().eq('id', row.id);
        cleanedDeadRefs += 1;
        if (deadRefSamples.length < 20) deadRefSamples.push('(sin public_id)');
      }
      continue;
    }

    const placement = classifyPublicIdPlacement(pid);

    // Brand/UI no pertenece a specimen_media
    if (placement === 'non_catalogue') {
      orphansDb += 1;
      if (mode === 'apply') {
        await db.from('specimen_media').delete().eq('id', row.id);
        removedNonCatalogue += 1;
        if (deadRefSamples.length < 20) deadRefSamples.push(`non-catalogue:${pid}`);
      }
      continue;
    }

    // Misplaced: reportar; no borrar Cloud ni recrear path
    if (placement === 'misplaced') {
      if (!misplacedSamples.includes(pid) && misplacedSamples.length < 40) {
        misplacedSamples.push(pid);
      }
      if (!misplacedAssets.some((a) => a.publicId === pid)) {
        misplacedCloud += 1;
      }
      orphansCloud += 1;
      if (mode === 'apply') {
        await updateMediaRow(db, row.id, {
          sync_status: 'ORPHAN_CLOUD',
          mirror_notes: 'fuera_de_lugar_no_canonical_REGION',
          last_synced_at: new Date().toISOString(),
        });
      }
      continue;
    }

    try {
      const asset = cloudByPid.get(pid) ?? (await cloudExists(pid));
      if (asset) {
        if (mode === 'apply') {
          await updateMediaRow(db, row.id, {
            public_id: asset.publicId,
            media_url: asset.secureUrl,
            sync_status: 'MIRRORED',
            cloudinary_exists: true,
            last_synced_at: new Date().toISOString(),
          });
          upsertedMedia += 1;
        }
        continue;
      }

      // public_id borrado en Cloudinary → limpiar fila DB (NO recrear asset)
      orphansDb += 1;
      if (mode === 'apply') {
        await db.from('specimen_media').delete().eq('id', row.id);
        cleanedDeadRefs += 1;
        if (deadRefSamples.length < 20) deadRefSamples.push(pid);
      }
    } catch (e) {
      errors.push({
        context: `db-clean ${pid}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ── C. Specimens: limpiar covers muertos; NUNCA crear _PENDING ───────────
  let specimens: DbSpecimen[] = [];
  {
    const full = await db
      .from('specimens')
      .select('id, species_name, media_url, cloudinary_public_id, rubro')
      .limit(2000);
    if (full.error) {
      const slim = await db
        .from('specimens')
        .select('id, species_name, media_url, cloudinary_public_id')
        .limit(2000);
      if (slim.error) {
        errors.push({ context: 'list specimens', message: slim.error.message });
      } else {
        specimens = (slim.data ?? []) as DbSpecimen[];
      }
    } else {
      specimens = (full.data ?? []) as DbSpecimen[];
    }
  }

  for (const sp of specimens) {
    const pid =
      extractPublicId(sp.cloudinary_public_id) ?? extractPublicId(sp.media_url);

    if (!pid) {
      orphansDb += 1;
      continue;
    }

    if (isMisplacedInventoryPublicId(pid)) {
      if (!misplacedSamples.includes(pid) && misplacedSamples.length < 40) {
        misplacedSamples.push(pid);
      }
      orphansCloud += 1;
      continue;
    }

    try {
      const asset = cloudByPid.get(pid) ?? (await cloudExists(pid));
      if (asset) {
        if (mode === 'apply') {
          await patchSpecimenMirror(
            db,
            sp.id,
            {
              mirror_status: 'MIRRORED',
              cloudinary_public_id: asset.publicId,
              media_url: asset.secureUrl,
            },
            { overwriteCover: true },
          );
          specimensTouched += 1;
        }
        continue;
      }

      // Cover apunta a asset borrado → null (no placeholder)
      orphansDb += 1;
      if (mode === 'apply') {
        const { error } = await db
          .from('specimens')
          .update({ cloudinary_public_id: null, media_url: null })
          .eq('id', sp.id);
        if (error && softColError(error.message)) {
          await db.from('specimens').update({ media_url: null }).eq('id', sp.id);
        } else if (error) {
          throw error;
        }
        cleanedDeadRefs += 1;
        if (deadRefSamples.length < 20) deadRefSamples.push(`specimen-cover:${pid}`);
        specimensTouched += 1;
      }
    } catch (e) {
      errors.push({
        context: `specimen ${sp.id}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Política: nunca escribir Cloudinary desde el espejo (_PENDING / placeholders).
  void isCataloguePublicId;

  const result: MirrorSyncResult = {
    ok: errors.length === 0,
    mode,
    cloudScanned: cloudAssets.length,
    dbScanned: mediaRows.length,
    upsertedMedia,
    createdCloud: 0,
    placeholders: 0,
    orphansCloud,
    orphansDb,
    specimensTouched,
    cleanedDeadRefs,
    removedNonCatalogue,
    misplacedCloud,
    errors,
    schemaGaps,
    deadRefSamples,
    misplacedSamples,
    runId,
    syncedAt: new Date().toISOString(),
  };

  if (runId && mode === 'apply') {
    await db
      .from('mirror_sync_runs')
      .update({
        finished_at: result.syncedAt,
        cloud_scanned: result.cloudScanned,
        db_scanned: result.dbScanned,
        upserted_media: result.upsertedMedia,
        created_cloud: result.createdCloud,
        placeholders: result.placeholders,
        orphans_cloud: result.orphansCloud,
        orphans_db: result.orphansDb,
        errors: result.errors,
        summary: {
          specimensTouched: result.specimensTouched,
          cleanedDeadRefs: result.cleanedDeadRefs,
          removedNonCatalogue: result.removedNonCatalogue,
          misplacedCloud: result.misplacedCloud,
          misplacedSamples: result.misplacedSamples,
          deadRefSamples: result.deadRefSamples,
          ok: result.ok,
          policy: 'canonical_REGION_only_no_auto_folders',
        },
      })
      .eq('id', runId);
  }

  return result;
}
