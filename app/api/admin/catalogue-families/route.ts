import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import {
  bootstrapAllCatalogueFamilies,
  createCatalogueFamily,
  deleteCatalogueFamilyHard,
  listCatalogueFamiliesAdmin,
  relocateCatalogueFamily,
  reorderCatalogueFamilies,
  resyncFamiliesFromCloudinary,
  seedCatalogueFamiliesIfEmpty,
  updateCatalogueFamily,
} from '@/lib/specimens/catalogueFamilyOverrides';
import { DRIED_SPECIMEN_REGION_FOLDERS } from '@/scripts/sync-cloudinary/roots';
import { CATALOGUE_CATEGORIES } from '@/lib/specimens/catalogueNav';
import { publishProduction } from '@/lib/admin/publish-production';

export const runtime = 'nodejs';
export const maxDuration = 120;

const CATEGORY_IDS = new Set<string>(
  CATALOGUE_CATEGORIES.filter((c) => c.rubroId === 'dried-specimens').map((c) => c.id),
);
const REGION_IDS = new Set<string>(DRIED_SPECIMEN_REGION_FOLDERS.map((r) => r.id));

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function okJson(
  payload: Record<string, unknown>,
  reason: string,
) {
  const production = await publishProduction({ mode: 'cache', reason });
  return NextResponse.json({ ...payload, production });
}

function isEditable(families: Array<{ id: string }>): boolean {
  if (families.length === 0) return true;
  return families.every(
    (f) => !f.id.startsWith('default:') && !f.id.startsWith('cloud:'),
  );
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return bad('unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const regionId = searchParams.get('regionId')?.trim() ?? '';
  const categoryId = searchParams.get('categoryId')?.trim() ?? '';
  if (!regionId || !categoryId) {
    return NextResponse.json({
      regions: DRIED_SPECIMEN_REGION_FOLDERS.map((r) => ({
        id: r.id,
        label: r.folder,
      })),
      categories: CATALOGUE_CATEGORIES.filter((c) => c.rubroId === 'dried-specimens').map(
        (c) => ({ id: c.id, label: c.label }),
      ),
    });
  }
  if (!REGION_IDS.has(regionId) || !CATEGORY_IDS.has(categoryId)) {
    return bad('regionId o categoryId inválido');
  }

  try {
    const families = await listCatalogueFamiliesAdmin(regionId, categoryId);
    return NextResponse.json({
      ok: true,
      families,
      editable: isEditable(families) || families.length === 0,
      regenerative: true,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return bad('unauthorized', 401);
  if (admin.role === 'viewer') return bad('forbidden', 403);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad('JSON inválido');
  }

  const action = String(body.action ?? '').trim();
  const regionId = String(body.regionId ?? '').trim();
  const categoryId = String(body.categoryId ?? '').trim();

  try {
    if (action === 'bootstrap_all') {
      const result = await bootstrapAllCatalogueFamilies();
      return okJson({ ok: true, ...result }, 'catalogue-families:bootstrap_all');
    }

    if (action === 'seed') {
      if (!REGION_IDS.has(regionId) || !CATEGORY_IDS.has(categoryId)) {
        return bad('regionId o categoryId inválido');
      }
      const result = await seedCatalogueFamiliesIfEmpty(regionId, categoryId, {
        forceDiscover: true,
        allowEmpty: true,
      });
      const families = await listCatalogueFamiliesAdmin(regionId, categoryId);
      return okJson(
        {
          ok: true,
          ...result,
          families,
          editable: isEditable(families) || families.length === 0,
        },
        `catalogue-families:seed:${regionId}:${categoryId}`,
      );
    }

    if (action === 'resync') {
      if (!REGION_IDS.has(regionId) || !CATEGORY_IDS.has(categoryId)) {
        return bad('regionId o categoryId inválido');
      }
      const result = await resyncFamiliesFromCloudinary(regionId, categoryId);
      const families = await listCatalogueFamiliesAdmin(regionId, categoryId);
      return okJson(
        {
          ok: true,
          ...result,
          families,
          editable: true,
        },
        `catalogue-families:resync:${regionId}:${categoryId}`,
      );
    }

    if (action === 'create') {
      if (!REGION_IDS.has(regionId) || !CATEGORY_IDS.has(categoryId)) {
        return bad('regionId o categoryId inválido');
      }
      const label = String(body.label ?? '').trim();
      const row = await createCatalogueFamily({ regionId, categoryId, label });
      const families = await listCatalogueFamiliesAdmin(regionId, categoryId);
      return okJson(
        { ok: true, family: row, families, editable: true },
        `catalogue-families:create:${regionId}:${categoryId}`,
      );
    }

    if (action === 'update') {
      const id = String(body.id ?? '').trim();
      if (!id) return bad('id requerido');
      const patch: {
        id: string;
        label?: string;
        active?: boolean;
        sortOrder?: number;
      } = { id };
      if (body.label != null) patch.label = String(body.label);
      if (body.active != null) patch.active = Boolean(body.active);
      if (body.sortOrder != null) patch.sortOrder = Number(body.sortOrder);
      const row = await updateCatalogueFamily(patch);
      const families = await listCatalogueFamiliesAdmin(row.regionId, row.categoryId);
      return okJson(
        { ok: true, family: row, families, editable: true },
        `catalogue-families:update:${id}`,
      );
    }

    if (action === 'reorder') {
      if (!REGION_IDS.has(regionId) || !CATEGORY_IDS.has(categoryId)) {
        return bad('regionId o categoryId inválido');
      }
      const orderedIds = Array.isArray(body.orderedIds)
        ? body.orderedIds.map((x) => String(x))
        : [];
      if (orderedIds.length === 0) return bad('orderedIds vacío');
      await reorderCatalogueFamilies(regionId, categoryId, orderedIds);
      const families = await listCatalogueFamiliesAdmin(regionId, categoryId);
      return okJson(
        { ok: true, families, editable: true },
        `catalogue-families:reorder:${regionId}:${categoryId}`,
      );
    }

    if (action === 'relocate') {
      const id = String(body.id ?? '').trim();
      const targetRegionId = String(body.targetRegionId ?? '').trim();
      const targetCategoryId = String(body.targetCategoryId ?? '').trim();
      if (!id) return bad('id requerido');
      if (!REGION_IDS.has(targetRegionId) || !CATEGORY_IDS.has(targetCategoryId)) {
        return bad('destino regionId/categoryId inválido');
      }
      // Lista de origen (panel actual) para refrescar tras sacar la ficha.
      if (!REGION_IDS.has(regionId) || !CATEGORY_IDS.has(categoryId)) {
        return bad('regionId o categoryId de origen inválido');
      }
      const row = await relocateCatalogueFamily({
        id,
        targetRegionId,
        targetCategoryId,
      });
      const families = await listCatalogueFamiliesAdmin(regionId, categoryId);
      return okJson(
        { ok: true, family: row, families, editable: true },
        `catalogue-families:relocate:${id}`,
      );
    }

    if (action === 'delete') {
      const id = String(body.id ?? '').trim();
      if (!id) return bad('id requerido');
      const where = await deleteCatalogueFamilyHard(id);
      const families = await listCatalogueFamiliesAdmin(
        regionId || where.regionId,
        categoryId || where.categoryId,
      );
      return okJson(
        { ok: true, families, editable: true },
        `catalogue-families:delete:${id}`,
      );
    }

    return bad(`action desconocida: ${action}`);
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500);
  }
}
