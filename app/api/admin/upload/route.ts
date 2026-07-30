// POST /api/admin/upload — subida binaria compartida (Sección 2: fotos/video/
// 3D de un espécimen; Sección 4: documentos de permisos y QR de embarque).
// Persiste en specimen_media (live) y actualiza cover en specimens cuando
// view = cover | principal | dorsal.
//
// Catálogo: SOLO bajo RUBROS/…/REGION… — nunca _PENDING, raíz ni especimenes-secos.
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  assertAllowedOperationalFolder,
  assertCanonicalUploadFolder,
  resolveCanonicalSpecimenFolder,
} from '@/lib/mirror/contract';
import { type SpecimenKind } from '@/lib/cloudinary/paths';
import { uploadImage, uploadVideo, uploadModel3d } from '@/lib/services/cloudinary-upload';

export const runtime = 'nodejs';

const MEDIA_TYPES = new Set(['photo_webp', 'model_3d_glb', 'video_mp4']);

const VIEW_ORDER: Record<string, number> = {
  cover: 0,
  principal: 0,
  dorsal: 1,
  ventral: 2,
  lateral: 3,
  macro: 4,
  model: 8,
  video: 9,
};

const VIEW_LABEL: Record<string, string> = {
  cover: 'Foto principal',
  principal: 'Foto principal',
  dorsal: 'WebP dorsal',
  ventral: 'WebP ventral',
  model: 'Modelo 3D',
  video: 'Video',
};

function softColError(message: string): boolean {
  return /column .* does not exist|Could not find/i.test(message);
}

function liveMediaType(mediaType: string): 'image' | 'video' | 'model' {
  if (mediaType === 'video_mp4') return 'video';
  if (mediaType === 'model_3d_glb') return 'model';
  return 'image';
}

async function resolveSpecimenTaxonomyFolder(
  specimenId: string,
): Promise<{ folder: string } | { error: string }> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(
      'cloudinary_public_id, media_url, familia, genero, rubro, region, categoria, taxonomy:taxonomy!taxonomy_id(order_name, family_name)',
    )
    .eq('id', specimenId)
    .maybeSingle();

  if (error && !softColError(error.message)) {
    return { error: error.message };
  }

  let row = data as Record<string, unknown> | null;
  if (!row) {
    const slim = await db
      .from('specimens')
      .select('cloudinary_public_id, media_url, familia, genero')
      .eq('id', specimenId)
      .maybeSingle();
    if (slim.error) return { error: slim.error.message };
    row = slim.data as Record<string, unknown> | null;
  }
  if (!row) return { error: 'Espécimen no encontrado' };

  const tax = row.taxonomy as
    | { order_name?: string | null; family_name?: string | null }
    | { order_name?: string | null; family_name?: string | null }[]
    | null
    | undefined;
  const taxObj = Array.isArray(tax) ? tax[0] ?? null : tax;

  const folder = resolveCanonicalSpecimenFolder({
    existingPublicId:
      (row.cloudinary_public_id as string | null) ?? (row.media_url as string | null),
    categoria: (row.categoria as string | null) ?? null,
    familia:
      (row.familia as string | null) ?? (taxObj?.family_name as string | null) ?? null,
    genero: (row.genero as string | null) ?? null,
    orderName: (taxObj?.order_name as string | null) ?? null,
  });

  if (!folder) {
    return {
      error:
        'Upload bloqueado: el espécimen no tiene categoría/familia para ubicar el asset bajo el árbol canónico RUBROS/…/REGION…. Completá taxonomía en Supabase; no se crea _PENDING ni especimenes-secos.',
    };
  }
  try {
    assertCanonicalUploadFolder(folder);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  return { folder };
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const specimenId = String(formData.get('specimenId') ?? '');
  const kind = String(formData.get('kind') ?? '') as SpecimenKind;
  const mediaType = String(formData.get('mediaType') ?? '');
  const view = formData.get('view') ? String(formData.get('view')).toLowerCase() : undefined;
  const documentFolder = formData.get('documentFolder')
    ? String(formData.get('documentFolder'))
    : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  }
  if (!MEDIA_TYPES.has(mediaType) && !documentFolder) {
    return NextResponse.json({ error: 'mediaType inválido' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let folder: string;
  let pathPolicy: 'specimen' | 'operational';
  if (documentFolder) {
    try {
      assertAllowedOperationalFolder(documentFolder);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }
    folder = documentFolder;
    pathPolicy = 'operational';
  } else {
    if (!specimenId) {
      return NextResponse.json({ error: 'Falta specimenId' }, { status: 400 });
    }
    void kind;
    const resolved = await resolveSpecimenTaxonomyFolder(specimenId);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    folder = resolved.folder;
    pathPolicy = 'specimen';
  }

  let result: { public_id: string; secure_url?: string };
  try {
    if (documentFolder && mediaType !== 'photo_webp' && mediaType !== 'video_mp4') {
      // Permisos / docs: tratar como imagen/raw operativo
      result = await uploadImage(buffer, { folder, pathPolicy });
    } else if (mediaType === 'photo_webp' || (documentFolder && !mediaType)) {
      result = await uploadImage(buffer, { folder, pathPolicy });
    } else if (mediaType === 'video_mp4') {
      result = await uploadVideo(buffer, { folder, pathPolicy });
    } else if (mediaType === 'model_3d_glb') {
      result = await uploadModel3d(buffer, { folder, pathPolicy });
    } else if (documentFolder) {
      result = await uploadImage(buffer, { folder, pathPolicy });
    } else {
      return NextResponse.json({ error: 'mediaType inválido' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  if (documentFolder) {
    return NextResponse.json({ cloudinaryId: result.public_id });
  }

  const publicId = result.public_id;
  const secureUrl = result.secure_url ?? null;
  const db = getSupabaseAdmin();
  const assetType = liveMediaType(mediaType);
  const displayOrder = view ? (VIEW_ORDER[view] ?? 9) : assetType === 'image' ? 1 : 9;

  let existingId: string | null = null;
  if (view) {
    const byView = await db
      .from('specimen_media')
      .select('id')
      .eq('specimen_id', specimenId)
      .eq('view', view)
      .maybeSingle();
    if (!byView.error && byView.data?.id) existingId = byView.data.id as string;
    else if (byView.error && !softColError(byView.error.message)) {
      // view column missing — fall through
    }
  }
  if (!existingId) {
    const byPid = await db
      .from('specimen_media')
      .select('id')
      .eq('public_id', publicId)
      .maybeSingle();
    if (byPid.data?.id) existingId = byPid.data.id as string;
  }

  const fullPayload: Record<string, unknown> = {
    specimen_id: specimenId,
    media_type: assetType,
    media_url: secureUrl,
    public_id: publicId,
    display_order: displayOrder,
    view: view ?? null,
    label: view ? (VIEW_LABEL[view] ?? view) : null,
  };

  const corePayload = {
    specimen_id: specimenId,
    media_type: assetType,
    media_url: secureUrl,
    public_id: publicId,
    display_order: displayOrder,
  };

  let dbErr: { message: string } | null = null;
  if (existingId) {
    const { error } = await db.from('specimen_media').update(fullPayload).eq('id', existingId);
    if (error && softColError(error.message)) {
      const { error: e2 } = await db.from('specimen_media').update(corePayload).eq('id', existingId);
      dbErr = e2;
    } else dbErr = error;
  } else {
    const { error } = await db.from('specimen_media').insert(fullPayload);
    if (error && softColError(error.message)) {
      const { error: e2 } = await db.from('specimen_media').insert(corePayload);
      dbErr = e2;
    } else dbErr = error;
  }

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  if (assetType === 'image') {
    const forceCover = view === 'cover' || view === 'principal';
    const maybeDorsal = !view || view === 'dorsal';
    if (forceCover || maybeDorsal) {
      if (forceCover) {
        await db
          .from('specimens')
          .update({ cloudinary_public_id: publicId, media_url: secureUrl })
          .eq('id', specimenId);
      } else {
        const { data: cur } = await db
          .from('specimens')
          .select('cloudinary_public_id, media_url')
          .eq('id', specimenId)
          .maybeSingle();
        if (!cur?.cloudinary_public_id && !cur?.media_url) {
          await db
            .from('specimens')
            .update({ cloudinary_public_id: publicId, media_url: secureUrl })
            .eq('id', specimenId);
        }
      }
    }
  }

  try {
    const asset: Record<string, unknown> = {
      type: mediaType,
      cloudinary_id: publicId,
    };
    if (view) asset.view = view;
    await db.rpc('append_media_asset', { p_specimen_id: specimenId, p_asset: asset });
  } catch {
    // opcional
  }

  return NextResponse.json({
    asset: { type: mediaType, cloudinary_id: publicId, view: view ?? null },
    publicId,
    folder,
  });
}
