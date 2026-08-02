/**
 * Fallback industrial para familias editables cuando falta la tabla Supabase.
 * Un solo JSON en Cloudinary (raw) — no escanea 80k assets.
 * Solo Server / API.
 */
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';

export const CATALOGUE_FAMILIES_META_PUBLIC_ID =
  'RUBROS/_neo_meta/catalogue_nav_families';

export type MetaFamilyRow = {
  id: string;
  regionId: string;
  categoryId: string;
  /** Nombre visible en web/admin (se puede renombrar libremente). */
  label: string;
  /**
   * Segmento carpeta Cloudinary para CARD/VIDEO.
   * No cambia al renombrar el label (así no se pierde el media).
   */
  folder?: string;
  sortOrder: number;
  active: boolean;
};

type StoreFile = {
  version: 1;
  updatedAt: string;
  families: MetaFamilyRow[];
};

function cloudConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function ensureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function readCatalogueFamiliesMeta(): Promise<StoreFile | null> {
  if (!cloudConfigured()) return null;
  ensureCloudinary();
  try {
    const res = (await cloudinary.api.resource(CATALOGUE_FAMILIES_META_PUBLIC_ID, {
      resource_type: 'raw',
    })) as { secure_url?: string; url?: string };
    const url = res.secure_url ?? res.url;
    if (!url) return null;
    // Cache-bust: CDN de Cloudinary a veces sirve JSON viejo tras overwrite.
    const bust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const fetched = await fetch(bust, { cache: 'no-store' });
    if (!fetched.ok) return null;
    const json = (await fetched.json()) as StoreFile;
    if (!json || !Array.isArray(json.families)) return null;
    json.families = json.families.map((f) => ({
      ...f,
      folder: (f.folder ?? '').trim() || f.label,
    }));
    return json;
  } catch {
    return null;
  }
}

export async function writeCatalogueFamiliesMeta(
  families: MetaFamilyRow[],
): Promise<void> {
  if (!cloudConfigured()) {
    throw new Error('Cloudinary no configurado (no se puede guardar familias).');
  }
  ensureCloudinary();
  const payload: StoreFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    families,
  };
  const buf = Buffer.from(JSON.stringify(payload), 'utf8');
  await new Promise<void>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'raw',
          public_id: CATALOGUE_FAMILIES_META_PUBLIC_ID,
          overwrite: true,
          invalidate: true,
          type: 'upload',
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      )
      .end(buf);
  });
}

export function newMetaFamilyId(): string {
  return `meta:${randomUUID()}`;
}

export async function listMetaFamiliesForScope(
  regionId: string,
  categoryId: string,
  includeInactive: boolean,
): Promise<MetaFamilyRow[] | null> {
  const store = await readCatalogueFamiliesMeta();
  if (!store) return null;
  return store.families
    .filter(
      (f) =>
        f.regionId === regionId &&
        f.categoryId === categoryId &&
        (includeInactive || f.active),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertMetaScope(
  regionId: string,
  categoryId: string,
  rows: MetaFamilyRow[],
): Promise<MetaFamilyRow[]> {
  const store = (await readCatalogueFamiliesMeta()) ?? {
    version: 1 as const,
    updatedAt: new Date().toISOString(),
    families: [] as MetaFamilyRow[],
  };
  const others = store.families.filter(
    (f) => !(f.regionId === regionId && f.categoryId === categoryId),
  );
  const normalized = rows.map((r, i) => ({
    ...r,
    regionId,
    categoryId,
    folder: (r.folder ?? '').trim() || r.label,
    sortOrder: i,
  }));
  await writeCatalogueFamiliesMeta([...others, ...normalized]);
  return normalized;
}
