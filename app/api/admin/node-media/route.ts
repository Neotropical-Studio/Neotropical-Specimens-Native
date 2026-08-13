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

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

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
    return { error: errMessage(e) };
  }
  return { target, folder };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return fail('unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId');
    const slot = parseSlot(searchParams.get('slot') ?? '');

    if (!targetId || !slot) {
      return NextResponse.json({
        ok: true,
        targets: await listNodeMediaUploadTargetsResolved(),
      });
    }

    const resolved = await resolveFolder(targetId, slot);
    if ('error' in resolved && !('folder' in resolved)) {
      return fail(resolved.error, 400);
    }
    const { target, folder } = resolved as {
      target: NodeMediaUploadTarget;
      folder: string;
    };

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
    return fail(errMessage(e), 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return fail('unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId') ?? '';
    const slot = parseSlot(searchParams.get('slot') ?? '');
    if (!targetId || !slot) {
      return fail('Faltan targetId y slot', 400);
    }

    const resolved = await resolveFolder(targetId, slot);
    if ('error' in resolved && !('folder' in resolved)) {
      return fail(resolved.error, 400);
    }
    const { target, folder } = resolved as {
      target: NodeMediaUploadTarget;
      folder: string;
    };

    const { deleted } = await clearNodeMediaFolder(folder);
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
      message:
        deleted || registryDeleted
          ? `Eliminado Cloudinary=${deleted}, registry=${registryDeleted}. Podés subir otro CARD/VIDEO.`
          : 'Slot vacío (Cloudinary + registry).',
    });
  } catch (e) {
    return fail(errMessage(e), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return fail('unauthorized', 401);

    const contentType = req.headers.get('content-type') ?? '';

    // Publicar media YA subido a la web (sin elegir archivo nuevo).
    if (contentType.includes('application/json')) {
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return fail('JSON inválido', 400);
      }
      if (String(body.action ?? '') !== 'publish-existing') {
        return fail('action inválida (usa publish-existing)', 400);
      }
      const targetId = String(body.targetId ?? '').trim();
      const slot = parseSlot(String(body.slot ?? ''));
      if (!targetId || !slot) {
        return fail('Faltan targetId y slot', 400);
      }

      const resolved = await resolveFolder(targetId, slot);
      if ('error' in resolved && !('folder' in resolved)) {
        return fail(resolved.error, 400);
      }
      const { target, folder } = resolved as {
        target: NodeMediaUploadTarget;
        folder: string;
      };

      const items = await listFolderResources(folder, 'all');
      const primary =
        items.find((i) => i.publicId.endsWith('/cover') || i.publicId.endsWith('/intro')) ??
        items[0] ??
        null;
      if (!primary) {
        return fail(
          'No hay foto/video subido en este nodo. Primero elegí un archivo con Galería/Cámara y GRABÁ.',
          404,
        );
      }

      const resourceType =
        primary.resourceType === 'video'
          ? 'video'
          : primary.resourceType === 'raw'
            ? 'raw'
            : 'image';

      try {
        await upsertNodeMedia({
          target_id: target.id,
          slot,
          public_id: primary.publicId,
          resource_type: resourceType,
          folder,
          node_path: target.nodePath,
          level: target.level,
          secure_url: primary.secureUrl,
          version: primary.version,
        });
      } catch (regErr) {
        console.warn(
          '[node-media] publish-existing registry upsert skipped',
          errMessage(regErr),
        );
      }

      invalidateNodeMediaInventory();
      const production = await publishProduction({
        mode: 'cache',
        reason: `node-media:publish-existing:${target.id}:${slot}`,
      });

      return NextResponse.json({
        ok: true,
        published: true,
        slot,
        targetId: target.id,
        folder,
        publicId: primary.publicId,
        secureUrl: primary.secureUrl,
        version: primary.version,
        production,
        message:
          slot === 'video'
            ? 'Video publicado en la web (caché de producción actualizada).'
            : 'Foto publicada en la web (caché de producción actualizada).',
      });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return fail('FormData inválido', 400);
    }

    const file = formData.get('file');
    const targetId = String(formData.get('targetId') ?? '');
    const slot = parseSlot(String(formData.get('slot') ?? ''));
    const replace = String(formData.get('replace') ?? '1') !== '0';

    if (!(file instanceof File)) {
      return fail('Falta archivo', 400);
    }
    if (!targetId || !slot) {
      return fail('Faltan targetId y slot (card|video)', 400);
    }

    const kind = detectMediaKind({ name: file.name, type: file.type });
    if (!kind) {
      return fail(
        'No se pudo clasificar el archivo. Subí una imagen, un video o un modelo 3D (glb/gltf).',
        400,
      );
    }

    if (slot === 'video' && kind !== 'video') {
      return fail('Esta ventana es VIDEO. Usá la ventana CARD para fotos/3D.', 400);
    }
    if (slot === 'card' && kind === 'video') {
      return fail('Esta ventana es CARD (foto/3D). Usá la ventana VIDEO para videos.', 400);
    }

    const resolved = await resolveFolder(targetId, slot);
    if ('error' in resolved && !('folder' in resolved)) {
      return fail(resolved.error, 400);
    }
    const { target, folder } = resolved as {
      target: NodeMediaUploadTarget;
      folder: string;
    };

    const buf = Buffer.from(await file.arrayBuffer());
    const publicId =
      kind === 'model3d' ? 'model' : slot === 'card' ? 'cover' : 'intro';

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
        version: typeof res.version === 'number' ? res.version : null,
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
        version: typeof res.version === 'number' ? res.version : null,
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
      version: typeof res.version === 'number' ? res.version : null,
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
    return fail(errMessage(e), 500);
  }
}
