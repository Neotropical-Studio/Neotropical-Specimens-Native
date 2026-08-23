'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { sql } from '@/lib/db';

export async function generateSpecimenCodeAction(regionCode: string): Promise<string> {
  await requireAdmin();
  const prefix = (regionCode || 'NEO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'NEO';
  const n = Date.now().toString(36).toUpperCase().slice(-5);
  return `${prefix}-${n}`;
}

const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().optional(),
);
const optionalPositiveNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().positive().optional(),
);
const optionalString = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined),
  z.string().optional(),
);

const SpecimenSchema = z
  .object({
    specimenCode: z.string().min(1, 'El ID code es obligatorio'),
    categoryId: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
      z.string().uuid().optional(),
    ),
    regionId: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
      z.string().uuid().optional(),
    ),
    scientificName: z.string().min(1, 'El nombre científico es obligatorio'),
    commonName: optionalString,
    specimenKind: z.enum(['dried_specimen', 'zoology_skeleton', 'plant']),
    orden: optionalString,
    familia: z.string().optional(),
    familiaSanityId: z.string().optional(),
    subfamilia: z.string().optional(),
    subfamiliaSanityId: z.string().optional(),
    genero: z.string().min(1, 'El género es obligatorio'),
    generoSanityId: z.string().optional(),
    especie: z.string().min(1, 'La especie es obligatoria'),
    especieSanityId: z.string().optional(),
    subespecie: optionalString,
    gradeCode: optionalString,
    sex: optionalString,
    color: optionalString,
    countryOrigin: optionalString,
    localidad: optionalString,
    gps: optionalString,
    /** Carpeta REGION geográfica Cloudinary (plana specimens.region). */
    geoRegionFolder: optionalString,
    /** Categoría merchandising Cloudinary (plana specimens.categoria). */
    catalogueCategoria: optionalString,
    dimensiones: optionalString,
    pesoGramos: optionalNumber,
    stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo').default(1),
    retailPrice: z.coerce.number().positive('El precio minorista debe ser positivo'),
    wholesalePrice: optionalPositiveNumber,
    wholesaleMinQty: optionalNumber,
    currency: z.string().min(1).default('USD'),
  })
  .refine((d) => !d.wholesalePrice || d.wholesalePrice <= d.retailPrice, {
    message: 'El precio mayorista no puede superar al minorista',
    path: ['wholesalePrice'],
  });

type SpecimenInput = z.infer<typeof SpecimenSchema>;

export interface SpecimenFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData): { data?: SpecimenInput; state?: SpecimenFormState } {
  const raw = Object.fromEntries(formData.entries());
  const parsed = SpecimenSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { state: { error: 'Revisa los campos marcados', fieldErrors } };
  }
  return { data: parsed.data };
}

function statusFromStock(stock: number): string {
  return stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

const BASE_SPECIMEN_COLUMNS = [
  'id', 'nombre_cientifico', 'nombre_comun', 'rubro_id', 'region_id', 'categoria_id',
  'familia_id', 'descripcion', 'imagen_url', 'fecha_coleccion', 'colector', 'created_at',
  'updated_at', 'code', 'scientific_name', 'family', 'category', 'region', 'country',
  'price', 'stock', 'images', 'description', 'common_name', 'attributes', 'metadata',
] as const;

type BaseSpecimenColumn = (typeof BASE_SPECIMEN_COLUMNS)[number];

function sanitizeSpecimenPayload(payload: Record<string, unknown>): Record<BaseSpecimenColumn, unknown> {
  return Object.fromEntries(
    BASE_SPECIMEN_COLUMNS.map((column) => [column, payload[column] ?? null]),
  ) as Record<BaseSpecimenColumn, unknown>;
}

function buildNeonRecord(input: SpecimenInput, id: string) {
  const region = input.geoRegionFolder?.trim() || null;
  const category = input.catalogueCategoria?.trim() || null;
  const payload = {
    id,
    nombre_cientifico: input.scientificName.trim(),
    nombre_comun: input.commonName ?? null,
    rubro_id: null,
    region_id: input.regionId ?? null,
    categoria_id: input.categoryId ?? null,
    familia_id: null,
    descripcion: null,
    imagen_url: null,
    fecha_coleccion: null,
    colector: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    code: input.specimenCode.trim(),
    scientific_name: input.scientificName.trim(),
    family: input.familia?.trim() || null,
    category,
    region,
    country: input.countryOrigin ?? null,
    price: input.retailPrice,
    stock: input.stock,
    images: JSON.stringify([]),
    description: null,
    common_name: input.commonName ?? null,
    attributes: JSON.stringify({
      color: input.color ?? null,
      sex: input.sex ?? null,
      grade: input.gradeCode ?? null,
      localidad: input.localidad ?? null,
      gps: input.gps ?? null,
      dimensiones: input.dimensiones ?? null,
      peso_gramos: input.pesoGramos ?? null,
      specimen_kind: input.specimenKind,
    }),
    metadata: JSON.stringify({
      orden: input.orden ?? null,
      family: input.familia ?? null,
      genus: input.genero,
      species: input.especie,
      subspecies: input.subespecie ?? null,
      wholesale_price: input.wholesalePrice ?? null,
      wholesale_min_qty: input.wholesaleMinQty ?? null,
      currency: input.currency || 'USD',
      status: statusFromStock(input.stock),
    }),
  };
  return sanitizeSpecimenPayload(payload);
}

async function upsertSpecimen(input: SpecimenInput, specimenId?: string): Promise<string> {
  const id = specimenId || crypto.randomUUID();
  const record = buildNeonRecord(input, id);
  const rows = await sql`
    INSERT INTO especimenes (
      id, nombre_cientifico, nombre_comun, rubro_id, region_id, categoria_id,
      familia_id, descripcion, imagen_url, fecha_coleccion, colector, created_at,
      updated_at, code, scientific_name, family, category, region, country, price,
      stock, images, description, common_name, attributes, metadata
    ) VALUES (
      ${record.id}, ${record.nombre_cientifico}, ${record.nombre_comun}, ${record.rubro_id},
      ${record.region_id}, ${record.categoria_id}, ${record.familia_id}, ${record.descripcion},
      ${record.imagen_url}, ${record.fecha_coleccion}, ${record.colector}, ${record.created_at},
      ${record.updated_at}, ${record.code}, ${record.scientific_name}, ${record.family},
      ${record.category}, ${record.region}, ${record.country}, ${record.price}, ${record.stock},
      ${record.images}::jsonb, ${record.description}, ${record.common_name},
      ${record.attributes}::jsonb, ${record.metadata}::jsonb
    )
    ON CONFLICT (code) DO UPDATE SET
      nombre_cientifico = EXCLUDED.nombre_cientifico,
      nombre_comun = EXCLUDED.nombre_comun,
      scientific_name = EXCLUDED.scientific_name,
      common_name = EXCLUDED.common_name,
      family = EXCLUDED.family,
      category_id = EXCLUDED.category_id,
      region_id = EXCLUDED.region_id,
      category = EXCLUDED.category,
      region = EXCLUDED.region,
      country = EXCLUDED.country,
      price = EXCLUDED.price,
      stock = EXCLUDED.stock,
      description = EXCLUDED.description,
      attributes = EXCLUDED.attributes,
      metadata = EXCLUDED.metadata,
      updated_at = now()
    RETURNING id
  `;
  return String(rows[0].id);
}

export async function createSpecimenAction(
  _prevState: SpecimenFormState,
  formData: FormData,
): Promise<SpecimenFormState> {
  await requireAdmin();

  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  try {
    const id = await upsertSpecimen(input);
    revalidatePath('/admin/especimenes');
    redirect(`/admin/especimenes/${id}?grabado=1`);
  } catch (error) {
    console.error('Error al guardar espécimen en Neon:', error);
    return { error: error instanceof Error ? error.message : 'No se pudo crear' };
  }
}

export async function updateSpecimenAction(
  specimenId: string,
  _prevState: SpecimenFormState,
  formData: FormData,
): Promise<SpecimenFormState> {
  await requireAdmin();

  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  try {
    const id = await upsertSpecimen(input, specimenId);
    revalidatePath('/admin/especimenes');
    revalidatePath(`/admin/especimenes/${id}`);
    redirect(`/admin/especimenes/${id}?grabado=1`);
  } catch (error) {
    console.error('Error al actualizar espécimen en Neon:', error);
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar' };
  }
}

/** Borra una ficha de especie (media relacionada si la BD lo permite en cascada). */
export async function deleteSpecimenAction(
  specimenId: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const id = specimenId.trim();
  if (!id) return { error: 'id vacío' };

  try {
    await sql`DELETE FROM especimen_medios WHERE specimen_id = ${id}`;
    await sql`DELETE FROM especimenes WHERE id = ${id}`;
  } catch (error) {
    console.error('Error al eliminar espécimen en Neon:', error);
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar' };
  }

  revalidatePath('/admin/especimenes');
  return { ok: true };
}

/**
 * Coloca / mueve una ficha a otra familia (y opcionalmente categoría / región plana).
 * Orden alfabético del listado se mantiene por nombre científico.
 */
export async function placeSpecimenFamilyAction(input: {
  specimenId: string;
  familia: string;
  categoria?: string | null;
  region?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const id = input.specimenId.trim();
  const familia = input.familia.trim();
  if (!id || !familia) return { error: 'specimenId y familia obligatorios' };

  try {
    await sql`
      UPDATE especimenes
      SET family = ${familia},
          category = ${input.categoria?.trim() || null},
          region = ${input.region?.trim() || null},
          updated_at = now()
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Error al recolocar espécimen en Neon:', error);
    return { error: error instanceof Error ? error.message : 'No se pudo recolocar' };
  }

  revalidatePath('/admin/especimenes');
  revalidatePath(`/admin/especimenes/${id}`);
  return { ok: true };
}
