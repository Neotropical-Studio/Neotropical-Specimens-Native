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
    categoryId: z.string().uuid('Selecciona una categoría'),
    regionId: z.string().uuid('Selecciona una región'),
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

function buildNeonRecord(input: SpecimenInput, id: string) {
  const region = input.geoRegionFolder?.trim() || null;
  const category = input.catalogueCategoria?.trim() || null;
  return {
    id,
    code: input.specimenCode.trim(),
    scientificName: input.scientificName.trim(),
    commonName: input.commonName ?? null,
    specimenKind: input.specimenKind,
    orderName: input.orden ?? null,
    family: input.familia?.trim() || null,
    subfamily: input.subfamilia?.trim() || null,
    genus: input.genero.trim(),
    species: input.especie.trim(),
    subspecies: input.subespecie ?? null,
    categoryId: input.categoryId,
    regionId: input.regionId,
    category,
    region,
    country: input.countryOrigin ?? null,
    locality: input.localidad ?? null,
    gps: input.gps ?? null,
    sex: input.sex ?? null,
    grade: input.gradeCode ?? null,
    dominantColor: input.color ?? null,
    dimensions: input.dimensiones ?? null,
    weightGrams: input.pesoGramos ?? null,
    stock: input.stock,
    retailPrice: input.retailPrice,
    wholesalePrice: input.wholesalePrice ?? null,
    wholesaleMinQty: input.wholesaleMinQty ?? null,
    currency: input.currency || 'USD',
    status: statusFromStock(input.stock),
    description: null,
    attributes: JSON.stringify({ primary_colors: input.color ? [input.color] : [], specimen_kind: input.specimenKind }),
    metadata: JSON.stringify({ order: input.orden ?? null, family: input.familia ?? null, region_id: input.regionId }),
  };
}

async function upsertSpecimen(input: SpecimenInput, specimenId?: string): Promise<string> {
  const id = specimenId || crypto.randomUUID();
  const record = buildNeonRecord(input, id);
  const rows = await sql`
    INSERT INTO especimenes (
      id, code, scientific_name, common_name, specimen_kind, order_name, family,
      subfamily, genus, species, subspecies, category_id, region_id, category,
      region, country, locality, gps, sex, grade, dominant_color, dimensions,
      weight_grams, stock, retail_price, wholesale_price, wholesale_min_qty,
      currency, status, description, attributes, metadata, updated_at
    ) VALUES (
      ${record.id}, ${record.code}, ${record.scientificName}, ${record.commonName},
      ${record.specimenKind}, ${record.orderName}, ${record.family}, ${record.subfamily},
      ${record.genus}, ${record.species}, ${record.subspecies}, ${record.categoryId},
      ${record.regionId}, ${record.category}, ${record.region}, ${record.country},
      ${record.locality}, ${record.gps}, ${record.sex}, ${record.grade}, ${record.dominantColor},
      ${record.dimensions}, ${record.weightGrams}, ${record.stock}, ${record.retailPrice},
      ${record.wholesalePrice}, ${record.wholesaleMinQty}, ${record.currency}, ${record.status},
      ${record.description}, ${record.attributes}::jsonb, ${record.metadata}::jsonb, now()
    )
    ON CONFLICT (code) DO UPDATE SET
      scientific_name = EXCLUDED.scientific_name,
      common_name = EXCLUDED.common_name,
      specimen_kind = EXCLUDED.specimen_kind,
      order_name = EXCLUDED.order_name,
      family = EXCLUDED.family,
      subfamily = EXCLUDED.subfamily,
      genus = EXCLUDED.genus,
      species = EXCLUDED.species,
      subspecies = EXCLUDED.subspecies,
      category_id = EXCLUDED.category_id,
      region_id = EXCLUDED.region_id,
      category = EXCLUDED.category,
      region = EXCLUDED.region,
      country = EXCLUDED.country,
      locality = EXCLUDED.locality,
      gps = EXCLUDED.gps,
      sex = EXCLUDED.sex,
      grade = EXCLUDED.grade,
      dominant_color = EXCLUDED.dominant_color,
      dimensions = EXCLUDED.dimensions,
      weight_grams = EXCLUDED.weight_grams,
      stock = EXCLUDED.stock,
      retail_price = EXCLUDED.retail_price,
      wholesale_price = EXCLUDED.wholesale_price,
      wholesale_min_qty = EXCLUDED.wholesale_min_qty,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
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
