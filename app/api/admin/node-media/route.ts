// POST /api/admin/node-media — subir / sobrescribir cover|intro (overwrite, sin vaciar carpeta)
// GET  /api/admin/node-media?targetId=&slot= — listar media actual
// DELETE — borrar slot (_card|_video) del nodo (admin autenticado)
//
// Tags: neo_node_card|video + marca neo_brand_* + neo_catalogue (ver lib/media/node-tags).
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import {
  listNodeMediaUploadTargetsResolved,
  findNodeMediaUploadTargetAsync,
  assertNodeMediaSlotFolderAsync,
} from '@/lib/mirror/targets-resolved';
import { type NodeMediaUploadTarget } from '@/lib/mirror/contract';
import { detectMediaKind } from '@/lib/media/kinds';
import {
  buildNodeMediaUploadContext,
  buildNodeMediaUploadTags,
} from '@/lib/media/node-tags';
import {
  clearNodeMediaFolder,
  listFolderResources,
  uploadImage,
  uploadModel3d,
  uploadVideo,
} from '@/lib/services/cloudinary-upload';
import { invalidateNodeMediaInventory } from '@/lib/services/node-media-inventory';
import { publishProduction } from '@/lib/admin/publish-production';
import {
  deleteNodeMediaSlot,
  upsertNodeMedia,
} from '@/lib/services/node-media-registry';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Slot = 'card' | 'video';

function parseSlot(raw: string): Slot | null {
  const s = raw.toLowerCase();
  if (s === 'video') return 'video';
  if (s === 'card') return 'card';
  return null;
}

async function resolveFolder(targetId: string, slot: Slot) {
  const target = await findNodeMediaUploadTargetAsync(targetId);
  if (!target) return { error: `Nodo desconocido: ${targetId}` as const };
  const folder = slot === 'card' ? target.cardFolder : target.videoFolder;
  try {
    await assertNodeMediaSlotFolderAsync(folder, slot);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  return { target, folder };
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId');
  const slot = parseSlot(searchParams.get('slot') ?? '');

  if (!targetId || !slot) {
    return NextResponse.json({ targets: await listNodeMediaUploadTargetsResolved() });
  }

  const resolved = await resolveFolder(targetId, slot);
  if ('error' in resolved && !('folder' in resolved)) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const { target, folder } = resolved as {
    target: NodeMediaUploadTarget;
    folder: string;
  };

  try {
    const items = await listFolderResources(folder, 'all');
    const primary =
      items.find((i) => i.publicId.endsWith('/cover') || i.publicId.endsWith('/intro')) ??
      items.find((i) => i.resourceType === (slot === 'video' ? 'video' : 'image')) ??
      items[0] ??
      null;
    return NextResponse.json({
      ok: true,
      targetId: target.id,
      slot,
      folder,
      items,
      primary,
      deleteAllowed: true,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId') ?? '';
  const slot = parseSlot(searchParams.get('slot') ?? '');
  if (!targetId || !slot) {
    return NextResponse.json({ error: 'Faltan targetId y slot' }, { status: 400 });
  }

  const resolved = await resolveFolder(targetId, slot);
  if ('error' in resolved && !('folder' in resolved)) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const { target, folder } = resolved as {
    target: NodeMediaUploadTarget;
    folder: string;
  };

  try {
    const { deleted } = await clearNodeMediaFolder(folder);
    // Registry DB + cache: fuente de verdad del storefront (industrial).
    const registryDeleted = await deleteNodeMediaSlot({
      targetId: target.id,
      slot,
      folder,
    });
    invalidateNodeMediaInventory(folder);
    const production = await publishProduction({
      mode: 'cache',
      reason: `node-media:delete:${target.id}:${slot}`,
    });
    return NextResponse.json({
      ok: true,
      deleted,
      registryDeleted,
      targetId: target.id,
      slot,
      folder,
      production,
      message: deleted || registryDeleted
        ? `Eliminado Cloudinary=${deleted}, registry=${registryDeleted}. Podés subir otro CARD/VIDEO.`
        : 'Slot vacío (Cloudinary + registry).',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const targetId = String(formData.get('targetId') ?? '');
  const slot = parseSlot(String(formData.get('slot') ?? ''));
  const replace = String(formData.get('replace') ?? '1') !== '0';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
  }
  if (!targetId || !slot) {
    return NextResponse.json(
      { error: 'Faltan targetId y slot (card|video)' },
      { status: 400 },
    );
  }

  const kind = detectMediaKind({ name: file.name, type: file.type });
  if (!kind) {
    return NextResponse.json(
      {
        error:
          'No se pudo clasificar el archivo. Subí una imagen, un video o un modelo 3D (glb/gltf).',
      },
      { status: 400 },
    );
  }

  if (slot === 'video' && kind !== 'video') {
    return NextResponse.json(
      { error: 'Esta ventana es VIDEO. Usá la ventana CARD para fotos/3D.' },
      { status: 400 },
    );
  }
  if (slot === 'card' && kind === 'video') {
    return NextResponse.json(
      { error: 'Esta ventana es CARD (foto/3D). Usá la ventana VIDEO para videos.' },
      { status: 400 },
    );
  }

  const resolved = await resolveFolder(targetId, slot);
  if ('error' in resolved && !('folder' in resolved)) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const { target, folder } = resolved as {
    target: NodeMediaUploadTarget;
    folder: string;
  };

  const buf = Buffer.from(await file.arrayBuffer());
  const publicId =
    kind === 'model3d' ? 'model' : slot === 'card' ? 'cover' : 'intro';

  try {
    // Overwrite del mismo publicId. NO vaciar carpeta aquí (si falla el upload no se pierde el viejo).
    const tags = buildNodeMediaUploadTags({
      slot,
      kind,
      level: target.level,
      targetId: target.id,
    });
    const context = buildNodeMediaUploadContext({
      nodePath: target.nodePath,
      slot,
      level: target.level,
      kind,
      targetId: target.id,
    });

    const overwrite = {
      folder,
      publicId,
      tags,
      context,
      pathPolicy: 'node-media' as const,
    };

    if (kind === 'video') {
      const res = await uploadVideo(buf, { ...overwrite, industrial: true, autoStudio: true });
      await upsertNodeMedia({
        target_id: target.id,
        slot,
        public_id: res.public_id,
        resource_type: 'video',
        folder,
        node_path: target.nodePath,
        level: target.level,
        secure_url: res.secure_url,
      });
      invalidateNodeMediaInventory();
      const production = await publishProduction({
        mode: 'cache',
        reason: `node-media:upload:${target.id}:${slot}:video`,
      });
      return NextResponse.json({
        ok: true,
        replaced: Boolean(replace),
        kind,
        slot,
        targetId: target.id,
        folder,
        publicId: res.public_id,
        secureUrl: res.secure_url,
        tags,
        optimized: true,
        autoStudio: true,
        registry: true,
        production,
      });
    }

    if (kind === 'model3d') {
      const res = await uploadModel3d(buf, { ...overwrite, autoStudio: true });
      await upsertNodeMedia({
        target_id: target.id,
        slot: 'card',
        public_id: res.public_id,
        resource_type: 'raw',
        folder,
        node_path: target.nodePath,
        level: target.level,
        secure_url: res.secure_url,
      });
      invalidateNodeMediaInventory();
      const production = await publishProduction({
        mode: 'cache',
        reason: `node-media:upload:${target.id}:card:model3d`,
      });
      return NextResponse.json({
        ok: true,
        replaced: Boolean(replace),
        kind,
        slot,
        targetId: target.id,
        folder,
        publicId: res.public_id,
        secureUrl: res.secure_url,
        tags,
        optimized: true,
        autoStudio: true,
        registry: true,
        production,
      });
    }

    // CARD: optimize + sharpen, SIN cutout (la escena/fondo del nodo se conserva).
    const res = await uploadImage(buf, { ...overwrite, industrial: true });
    await upsertNodeMedia({
      target_id: target.id,
      slot,
      public_id: res.public_id,
      resource_type: 'image',
      folder,
      node_path: target.nodePath,
      level: target.level,
      secure_url: res.secure_url,
    });
    invalidateNodeMediaInventory();
    const production = await publishProduction({
      mode: 'cache',
      reason: `node-media:upload:${target.id}:${slot}:image`,
    });
    return NextResponse.json({
      ok: true,
      replaced: Boolean(replace),
      kind,
      slot,
      targetId: target.id,
      folder,
      publicId: res.public_id,
      secureUrl: res.secure_url,
      tags,
      optimized: true,
      autoStudio: false,
      registry: true,
      production,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
