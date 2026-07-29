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
import { specimenFolder } from '@/lib/cloudinary/paths';
import { uploadImage, uploadVideo, uploadModel3d } from '@/lib/services/cloudinary-upload';

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
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const specimenCode = String(formData.get('specimenCode') ?? '').trim().toUpperCase();
  const view         = String(formData.get('view')         ?? 'dorsal').toLowerCase();
  const removeBg     = formData.get('removeBg') === 'true';

  if (!(file instanceof File))   return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  if (!specimenCode)              return NextResponse.json({ error: 'Falta specimenCode' }, { status: 400 });

  // ── Detectar tipo por extensión ────────────────────────────────────────────
  const ext    = file.name.split('.').pop()?.toLowerCase() ?? '';
  const assetType = EXT_TYPE[ext];
  if (!assetType) return NextResponse.json({ error: `Extensión no soportada: .${ext}` }, { status: 400 });

  const db = getSupabaseAdmin();

  // ── Lookup del espécimen ───────────────────────────────────────────────────
  // 1) metadata->>code  (CSV-ingestados)
  // 2) specimen_code    (registros legacy)
  let specimenId: string | null = null;

  const r1 = await db.from('specimens').select('id').eq('metadata->>code', specimenCode).limit(1);
  if (r1.data?.length) specimenId = r1.data[0].id;

  if (!specimenId) {
    const r2 = await db.from('specimens').select('id').eq('specimen_code', specimenCode).limit(1);
    if (r2.data?.length) specimenId = r2.data[0].id;
  }

  if (!specimenId) {
    return NextResponse.json(
      { error: `Espécimen "${specimenCode}" no encontrado en la BD` },
      { status: 404 },
    );
  }

  // ── Subida a Cloudinary ────────────────────────────────────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = specimenFolder('dried_specimen', 'neotropical');
  const publicIdBase = `${specimenCode}_${view}`;

  let result;
  try {
    if (assetType === 'image') {
      result = await uploadImage(buffer, { folder, publicId: publicIdBase, removeBg });
    } else if (assetType === 'video') {
      result = await uploadVideo(buffer, { folder, publicId: publicIdBase });
    } else {
      result = await uploadModel3d(buffer, { folder, publicId: publicIdBase });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const publicId = result.public_id as string;

  // ── Insertar en specimen_media ─────────────────────────────────────────────
  const { error: dbErr } = await db.from('specimen_media').upsert(
    {
      specimen_id:   specimenId,
      media_type:    assetType,
      media_url:     result.secure_url,
      public_id:     publicId,
      display_order: VIEW_ORDER[view] ?? 9,
    },
    { onConflict: 'public_id' },
  );

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({
    ok:        true,
    publicId,
    assetType,
    view,
    specimenId,
    secureUrl: result.secure_url,
  });
}
