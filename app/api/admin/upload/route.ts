// POST /api/admin/upload — subida binaria compartida (Sección 2: fotos/video/
// 3D de un espécimen; Sección 4: documentos de permisos y QR de embarque).
// Route Handler (no Server Action) para poder aceptar FormData multipart
// directo desde fetch() y reutilizar lib/services/cloudinary-upload.ts sin
// tocarlo — el mismo wrapper que ya usa el sync Sanity→Supabase.
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { specimenFolder, SPECIMEN_KIND_FOLDERS, type SpecimenKind } from '@/lib/cloudinary/paths';
import { uploadImage, uploadVideo, uploadModel3d } from '@/lib/services/cloudinary-upload';

export const runtime = 'nodejs';

const MEDIA_TYPES = new Set(['photo_webp', 'model_3d_glb', 'video_mp4']);

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const specimenId = String(formData.get('specimenId') ?? '');
  const kind = String(formData.get('kind') ?? '') as SpecimenKind;
  const regionCode = String(formData.get('regionCode') ?? '');
  const mediaType = String(formData.get('mediaType') ?? '');
  const view = formData.get('view') ? String(formData.get('view')) : undefined;
  // documentFolder: usado por Sección 4 (documentos legales / QR de embarque)
  // en vez de la convención de carpeta por espécimen — mutuamente excluyente
  // con specimenId/kind/regionCode.
  const documentFolder = formData.get('documentFolder') ? String(formData.get('documentFolder')) : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  }
  if (!MEDIA_TYPES.has(mediaType) && !documentFolder) {
    return NextResponse.json({ error: 'mediaType inválido' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let folder: string;
  if (documentFolder) {
    folder = documentFolder;
  } else {
    if (!specimenId || !regionCode) {
      return NextResponse.json({ error: 'Falta specimenId/regionCode' }, { status: 400 });
    }
    if (!(kind in SPECIMEN_KIND_FOLDERS)) {
      return NextResponse.json({ error: 'kind inválido' }, { status: 400 });
    }
    folder = specimenFolder(kind, regionCode);
  }

  let result;
  try {
    if (mediaType === 'photo_webp') result = await uploadImage(buffer, { folder });
    else if (mediaType === 'video_mp4') result = await uploadVideo(buffer, { folder });
    else result = await uploadModel3d(buffer, { folder });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  // Camino de documentos (Sección 4): sólo sube y devuelve el public_id —
  // quien llama decide en qué columna/registro guardarlo.
  if (documentFolder) {
    return NextResponse.json({ cloudinaryId: result.public_id });
  }

  const asset: Record<string, unknown> = { type: mediaType, cloudinary_id: result.public_id };
  if (view) asset.view = view;

  const db = getSupabaseAdmin();
  const { error } = await db.rpc('append_media_asset', { p_specimen_id: specimenId, p_asset: asset });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ asset });
}
