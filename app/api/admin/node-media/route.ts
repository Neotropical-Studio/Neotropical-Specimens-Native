// POST /api/admin/node-media
// Sube card o video de ingreso a un nodo canónico (rubro / región / categoría / familia).
// Carpeta FIJA: {nodePath}/_card o {nodePath}/_video — allowlist, sin elegir path libre.
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import {
  assertNodeMediaSlotFolder,
  findNodeMediaUploadTarget,
} from '@/lib/mirror/contract';
import { uploadImage, uploadVideo } from '@/lib/services/cloudinary-upload';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { listNodeMediaUploadTargets } = await import('@/lib/mirror/contract');
  return NextResponse.json({ targets: listNodeMediaUploadTargets() });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const targetId = String(formData.get('targetId') ?? '');
  const slotRaw = String(formData.get('slot') ?? '').toLowerCase();
  const slot = slotRaw === 'video' ? 'video' : slotRaw === 'card' ? 'card' : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
  }
  if (!targetId || !slot) {
    return NextResponse.json(
      { error: 'Faltan targetId y slot (card|video)' },
      { status: 400 },
    );
  }

  const target = findNodeMediaUploadTarget(targetId);
  if (!target) {
    return NextResponse.json({ error: `Nodo desconocido: ${targetId}` }, { status: 400 });
  }

  const folder = slot === 'card' ? target.cardFolder : target.videoFolder;
  try {
    assertNodeMediaSlotFolder(folder, slot);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 80) || slot;

  try {
    if (slot === 'video') {
      const res = await uploadVideo(buf, {
        folder,
        publicId: `${baseName}`,
        tags: ['neo_node_video', `neo_${target.level}`, target.id],
        context: {
          neo_node: target.nodePath,
          neo_slot: 'video',
          neo_level: target.level,
        },
      });
      return NextResponse.json({
        ok: true,
        slot,
        targetId: target.id,
        folder,
        publicId: res.public_id,
        secureUrl: res.secure_url,
      });
    }

    const res = await uploadImage(buf, {
      folder,
      publicId: `${baseName}`,
      tags: ['neo_node_card', `neo_${target.level}`, target.id],
      context: {
        neo_node: target.nodePath,
        neo_slot: 'card',
        neo_level: target.level,
      },
    });
    return NextResponse.json({
      ok: true,
      slot,
      targetId: target.id,
      folder,
      publicId: res.public_id,
      secureUrl: res.secure_url,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
