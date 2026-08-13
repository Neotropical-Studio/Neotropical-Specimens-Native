// POST /api/admin/ingest-batch
// Subida individual de un asset con:
//  · lookup de espécimen por código (metadata->>code o specimen_code)
//  · eliminación de fondo vía Cloudinary AI (opcional, solo fotos)
//  · inserción en specimen_media
//
// Llamado por el IngestionEngine del admin una vez por archivo.
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  assertCanonicalUploadFolder,
  resolveCanonicalSpecimenFolder,
} from '@/lib/mirror/contract';
import { uploadImage, uploadVideo, uploadModel3d } from '@/lib/services/cloudinary-upload';
import { publishProduction } from '@/lib/admin/publish-production';

export const runtime = 'nodejs';
export const maxDuration = 60; // rembg-AI puede tardar hasta ~30s en Cloudinary

// Mapeo extensión → tipo interno
const EXT_TYPE: Record<string, 'image' | 'model' | 'video'> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', tiff: 'image',
  glb: 'model', gltf: 'model',
  mp4: 'video', mov: 'video',
};

// view → display_order
const VIEW_ORDER: Record<string, number> = {
  dorsal: 0, ventral: 1, lateral: 2, macro: 3,
};

export async function POST(req: NextRequest) {
  try {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'FormData inválido' }, { status: 400 });
  }
  const file = formData.get('file');
  const specimenCode = String(formData.get('specimenCode') ?? '').trim().toUpperCase();
  const view         = String(formData.get('view')         ?? 'dorsal').toLowerCase();
  const removeBg     = formData.get('removeBg') === 'true';

  if (!(file instanceof File))   return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 });
  if (!specimenCode)              return NextResponse.json({ ok: false, error: 'Falta specimenCode' }, { status: 400 });

  // ── Detectar tipo por extensión ────────────────────────────────────────────
  const ext    = file.name.split('.').pop()?.toLowerCase() ?? '';
  const assetType = EXT_TYPE[ext];
  if (!assetType) return NextResponse.json({ ok: false, error: `Extensión no soportada: .${ext}` }, { status: 400 });

  const db = getSupabaseAdmin();

  // ── Lookup del espécimen (live: sin metadata / specimen_code) ─────────────
  // Acepta: UUID completo, LEGACY-<8 hex del id>, o species_name exacto.
  type SpecRow = {
    id: string;
    cloudinary_public_id?: string | null;
    media_url?: string | null;
    familia?: string | null;
    genero?: string | null;
    categoria?: string | null;
  };
  let specimen: SpecRow | null = null;

  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(specimenCode);
  if (uuidLike) {
    const byId = await db
      .from('specimens')
      .select('id, cloudinary_public_id, media_url, familia, genero, categoria')
      .eq('id', specimenCode)
      .maybeSingle();
    if (byId.data?.id) specimen = byId.data as SpecRow;
  }

  if (!specimen && specimenCode.startsWith('LEGACY-')) {
    const hex = specimenCode.replace(/^LEGACY-/, '').slice(0, 8).toLowerCase();
    const { data: all } = await db
      .from('specimens')
      .select('id, cloudinary_public_id, media_url, familia, genero, categoria')
      .limit(2000);
    const hit = (all ?? []).find((r) => String(r.id).replace(/-/g, '').startsWith(hex));
    if (hit) specimen = hit as SpecRow;
  }

  if (!specimen) {
    const byName = await db
      .from('specimens')
      .select('id, cloudinary_public_id, media_url, familia, genero, categoria')
      .ilike('species_name', specimenCode)
      .limit(1);
    if (byName.data?.length) specimen = byName.data[0] as SpecRow;
  }

  if (!specimen) {
    return NextResponse.json(
      {
        error: `Espécimen "${specimenCode}" no encontrado (usa UUID, LEGACY-XXXXXXXX o species_name)`,
      },
      { status: 404 },
    );
  }

  const specimenId = specimen.id;

  // Carpeta SOLO bajo árbol canónico (nunca especimenes-secos/neotropical)
  let folder: string;
  try {
    const resolved = resolveCanonicalSpecimenFolder({
      existingPublicId: specimen.cloudinary_public_id ?? specimen.media_url,
      categoria: specimen.categoria,
      familia: specimen.familia,
      genero: specimen.genero,
    });
    if (!resolved) {
      return NextResponse.json(
        {
          error:
            'Upload bloqueado: falta categoría/familia en Supabase para el path canónico RUBROS/…/REGION…. No se crea _PENDING ni especimenes-secos.',
        },
        { status: 400 },
      );
    }
    assertCanonicalUploadFolder(resolved);
    folder = resolved;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  // ── Subida a Cloudinary ────────────────────────────────────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());
  const publicIdBase = `${specimenCode}_${view}`;

  let result;
  try {
    if (assetType === 'image') {
      result = await uploadImage(buffer, {
        folder,
        publicId: publicIdBase,
        removeBg,
        pathPolicy: 'specimen',
      });
    } else if (assetType === 'video') {
      result = await uploadVideo(buffer, {
        folder,
        publicId: publicIdBase,
        pathPolicy: 'specimen',
      });
    } else {
      result = await uploadModel3d(buffer, {
        folder,
        publicId: publicIdBase,
        pathPolicy: 'specimen',
      });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }

  const publicId = result.public_id as string;

  // ── Insertar en specimen_media (live puede no tener UNIQUE en public_id) ──
  const existing = await db
    .from('specimen_media')
    .select('id')
    .eq('public_id', publicId)
    .maybeSingle();

  const mediaPayload = {
    specimen_id: specimenId,
    media_type: assetType,
    media_url: result.secure_url,
    public_id: publicId,
    display_order: VIEW_ORDER[view] ?? 9,
  };

  const dbErr = existing.data?.id
    ? (await db.from('specimen_media').update(mediaPayload).eq('id', existing.data.id)).error
    : (await db.from('specimen_media').insert(mediaPayload)).error;

  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });

  // Ancla cover en specimens si es dorsal/primera vista
  if (view === 'dorsal' || !view) {
    await db
      .from('specimens')
      .update({ cloudinary_public_id: publicId, media_url: result.secure_url })
      .eq('id', specimenId);
  }

  const production = await publishProduction({
    mode: 'cache',
    reason: `ingest-batch:${specimenId}:${view ?? assetType}`,
  });

  return NextResponse.json({
    ok:        true,
    publicId,
    assetType,
    view,
    specimenId,
    secureUrl: result.secure_url,
    production,
  });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

}
