/**
 * Registry industrial CARD/VIDEO de nodo.
 *
 * Fuente de verdad: tabla `node_media` (Supabase).
 * Cloudinary = almacenamiento de archivos + tags de recuperación.
 *
 * Reglas:
 * - Nunca inventar public_ids (cero ghosts cover/intro).
 * - Upsert al grabar; delete al eliminar.
 * - Bootstrap opcional desde tags Cloudinary si la tabla está vacía.
 * - Regenerativo: target_id / node_path / folder vienen del upload, no de listas fijas.
 */
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { NEO_NODE_INVENTORY_TAGS } from '@/lib/media/node-tags';
import { listNodeMediaUploadTargets } from '@/lib/mirror/contract';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type NodeMediaSlot = 'card' | 'video';

export type NodeMediaRow = {
  target_id: string;
  slot: NodeMediaSlot;
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  folder: string;
  node_path: string;
  level?: string | null;
  secure_url?: string | null;
};

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function cloudConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/** Lectura storefront: solo public_ids reales en DB. */
export async function listRegistryPublicIds(): Promise<string[] | null> {
  const db = isSupabaseAdminConfigured()
    ? getSupabaseAdmin()
    : anonClient();
  if (!db) return null;

  try {
    const { data, error } = await db.from('node_media').select('public_id');
    if (error) {
      // Tabla aún no migrada → caller hace bootstrap Cloudinary.
      if (/relation .*node_media.* does not exist|Could not find the table/i.test(error.message)) {
        return null;
      }
      console.error('[node-media-registry] list failed', error.message);
      return null;
    }
    return (data ?? [])
      .map((r) => (typeof r.public_id === 'string' ? r.public_id : ''))
      .filter(Boolean);
  } catch (err) {
    console.error('[node-media-registry] list threw', err);
    return null;
  }
}

export async function upsertNodeMedia(row: NodeMediaRow): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    console.warn('[node-media-registry] skip upsert: service_role no configurado');
    return;
  }
  const db = getSupabaseAdmin();
  const { error } = await db.from('node_media').upsert(
    {
      target_id: row.target_id,
      slot: row.slot,
      public_id: row.public_id,
      resource_type: row.resource_type,
      folder: row.folder.replace(/\/+$/, ''),
      node_path: row.node_path.replace(/\/+$/, ''),
      level: row.level ?? null,
      secure_url: row.secure_url ?? null,
      sync_status: 'MIRRORED',
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'target_id,slot' },
  );
  if (error) {
    console.error('[node-media-registry] upsert failed', error.message);
    throw new Error(`Registry node_media: ${error.message}`);
  }
}

/** Borra filas del slot (por target+slot y/o carpeta). */
export async function deleteNodeMediaSlot(opts: {
  targetId: string;
  slot: NodeMediaSlot;
  folder?: string;
}): Promise<number> {
  if (!isSupabaseAdminConfigured()) return 0;
  const db = getSupabaseAdmin();
  const folder = opts.folder?.replace(/\/+$/, '');

  const { data: byTarget, error: e1 } = await db
    .from('node_media')
    .delete()
    .eq('target_id', opts.targetId)
    .eq('slot', opts.slot)
    .select('id');
  if (e1) {
    console.error('[node-media-registry] delete by target failed', e1.message);
  }

  let extra = 0;
  if (folder) {
    const { data: byFolder, error: e2 } = await db
      .from('node_media')
      .delete()
      .eq('folder', folder)
      .select('id');
    if (e2) {
      console.error('[node-media-registry] delete by folder failed', e2.message);
    } else {
      extra = byFolder?.length ?? 0;
    }
  }

  return (byTarget?.length ?? 0) + extra;
}

/**
 * Bootstrap industrial: tags Cloudinary → filas registry.
 * Solo cuando la tabla está vacía (cuenta nueva / post-migración).
 * No hardcodea nodos: deriva target/slot/folder del public_id.
 */
export async function bootstrapRegistryFromCloudinaryTags(): Promise<string[]> {
  if (!cloudConfigured() || !isSupabaseAdminConfigured()) return [];

  const publicIds = await fetchTaggedNodeMediaPublicIds();
  if (publicIds.length === 0) return [];

  const db = getSupabaseAdmin();
  const rows = publicIds.map((pid) => deriveRegistryRowFromPublicId(pid)).filter(Boolean) as NodeMediaRow[];

  if (rows.length === 0) return publicIds;

  const { error } = await db.from('node_media').upsert(
    rows.map((r) => ({
      target_id: r.target_id,
      slot: r.slot,
      public_id: r.public_id,
      resource_type: r.resource_type,
      folder: r.folder,
      node_path: r.node_path,
      level: r.level ?? null,
      sync_status: 'MIRRORED',
      last_synced_at: new Date().toISOString(),
    })),
    { onConflict: 'target_id,slot' },
  );
  if (error) {
    console.error('[node-media-registry] bootstrap upsert failed', error.message);
  }
  return publicIds;
}

export async function fetchTaggedNodeMediaPublicIds(): Promise<string[]> {
  if (!cloudConfigured()) return [];
  const out = new Set<string>();
  const types = ['image', 'video', 'raw'] as const;
  for (const tag of NEO_NODE_INVENTORY_TAGS) {
    for (const rt of types) {
      let nextCursor: string | undefined;
      do {
        try {
          const res = (await cloudinary.api.resources_by_tag(tag, {
            resource_type: rt,
            max_results: 500,
            type: 'upload',
            next_cursor: nextCursor,
          })) as {
            resources?: Array<{ public_id?: string }>;
            next_cursor?: string;
          };
          for (const r of res.resources ?? []) {
            if (r.public_id) out.add(r.public_id);
          }
          nextCursor = res.next_cursor;
        } catch {
          nextCursor = undefined;
        }
      } while (nextCursor);
    }
  }
  return [...out];
}

/**
 * Deriva fila registry desde public_id canónico:
 *   …/<nodePath>/_card/cover  |  …/<nodePath>/_video/intro
 * target_id: match contrato allowlist por folder; si no, path regenerativo.
 */
export function deriveRegistryRowFromPublicId(publicId: string): NodeMediaRow | null {
  const pid = publicId.replace(/^\/+|\/+$/g, '');
  const cardIdx = pid.lastIndexOf('/_card/');
  const videoIdx = pid.lastIndexOf('/_video/');
  let slot: NodeMediaSlot | null = null;
  let cut = -1;
  if (cardIdx >= 0 && (videoIdx < 0 || cardIdx > videoIdx)) {
    slot = 'card';
    cut = cardIdx;
  } else if (videoIdx >= 0) {
    slot = 'video';
    cut = videoIdx;
  }
  if (!slot || cut < 0) return null;

  const nodePath = pid.slice(0, cut);
  const folder = `${nodePath}/${slot === 'card' ? '_card' : '_video'}`;
  const resource_type: NodeMediaRow['resource_type'] =
    slot === 'video' ? 'video' : 'image';

  let target_id = `path:${nodePath}`;
  let level: string | null = null;
  const match = listNodeMediaUploadTargets().find(
    (t) => (slot === 'card' ? t.cardFolder : t.videoFolder) === folder,
  );
  if (match) {
    target_id = match.id;
    level = match.level;
  }

  return {
    target_id,
    slot,
    public_id: pid,
    resource_type,
    folder,
    node_path: nodePath,
    level,
  };
}
