'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { createFreeTaxonomy } from '@/lib/sync/resolveTaxonomy';

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

function softColError(message: string): boolean {
  return /column .* does not exist|Could not find/i.test(message);
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

function rubroFromKind(kind: SpecimenInput['specimenKind']): string {
  if (kind === 'zoology_skeleton') return 'ZOOLOGIA';
  if (kind === 'plant') return 'PLANTAS';
  return 'ESPECIMENES_SECOS';
}

function statusFromStock(stock: number): string {
  return stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

/** Columnas planas confirmadas en live (sección A). */
function buildLiveCore(
  input: SpecimenInput,
  ctx: {
    taxonomyId: string;
    regionText: string | null;
    categoria: string | null;
    localidad: string | null;
  },
): Record<string, unknown> {
  const speciesName = input.scientificName.trim();

  return {
    species_name: speciesName,
    taxonomy_id: ctx.taxonomyId,
    region_id: input.regionId,
    rubro: rubroFromKind(input.specimenKind),
    region: ctx.regionText,
    categoria: ctx.categoria,
    familia: input.familia?.trim() || null,
    subfamilia: input.subfamilia?.trim() || null,
    genero: input.genero.trim(),
    especie: input.especie.trim(),
    subespecie: input.subespecie || null,
    sexo: input.sex || null,
    calidad: input.gradeCode || null,
    color_dominante: input.color || null,
    origen: input.countryOrigin || null,
    localidad: input.localidad || ctx.localidad,
    gps: input.gps || null,
    dimensiones: input.dimensiones || null,
    peso_gramos: typeof input.pesoGramos === 'number' ? input.pesoGramos : null,
    precio_menor: input.retailPrice,
    precio_mayor: input.wholesalePrice ?? null,
    status: statusFromStock(input.stock),
  };
}

/** Campos opcionales (0009 / sección B). Se intentan; si faltan columnas, se omiten. */
function buildOptionalExtras(input: SpecimenInput): Record<string, unknown> {
  return {
    specimen_code: input.specimenCode.trim(),
    stock: input.stock,
    stock_status: statusFromStock(input.stock),
    category_id: input.categoryId,
    global_region_id: input.regionId,
    attributes: {
      common_name: input.commonName ?? null,
      sex: input.sex ?? null,
      grade_code: input.gradeCode ?? null,
      quality: input.gradeCode ?? null,
      country_origin: input.countryOrigin ?? null,
      specimen_kind: input.specimenKind,
      primary_colors: input.color ? [input.color] : null,
    },
    metadata: {
      order: input.orden ?? null,
      orden: input.orden ?? null,
      family: input.familia ?? null,
      familia: input.familia ?? null,
      subfamilia: input.subfamilia ?? null,
      genus: input.genero,
      genero: input.genero,
      especie: input.especie,
      subespecie: input.subespecie ?? null,
      common_name: input.commonName ?? null,
      nombre_cientifico: input.scientificName.trim(),
      localidad: input.localidad ?? null,
      gps: input.gps ?? null,
      region_id: input.regionId,
    },
    pricing: {
      retail_price: input.retailPrice,
      wholesale_price: input.wholesalePrice ?? null,
      wholesale_min_qty: input.wholesaleMinQty ?? null,
      currency: input.currency || 'USD',
    },
  };
}

async function upsertWithSoftExtras(
  db: ReturnType<typeof getSupabaseAdmin>,
  mode: 'insert' | 'update',
  specimenId: string | null,
  core: Record<string, unknown>,
  extras: Record<string, unknown>,
): Promise<{ id?: string; error?: string }> {
  const full = { ...core, ...extras };

  if (mode === 'insert') {
    const { data, error } = await db.from('specimens').insert(full).select('id').single();
    if (!error) return { id: data.id as string };
    if (!softColError(error.message)) return { error: error.message };

    const { data: d2, error: e2 } = await db.from('specimens').insert(core).select('id').single();
    if (e2) return { error: e2.message };
    const id = d2.id as string;
    // Intento best-effort de extras uno a uno
    for (const [key, value] of Object.entries(extras)) {
      const { error: e3 } = await db.from('specimens').update({ [key]: value }).eq('id', id);
      if (e3 && !softColError(e3.message)) {
        // no bloquear por extras
      }
    }
    return { id };
  }

  const { error } = await db.from('specimens').update(full).eq('id', specimenId!);
  if (!error) return { id: specimenId! };
  if (!softColError(error.message)) return { error: error.message };

  const { error: e2 } = await db.from('specimens').update(core).eq('id', specimenId!);
  if (e2) return { error: e2.message };
  for (const [key, value] of Object.entries(extras)) {
    await db.from('specimens').update({ [key]: value }).eq('id', specimenId!);
  }
  return { id: specimenId! };
}

async function buildRows(
  db: ReturnType<typeof getSupabaseAdmin>,
  input: SpecimenInput,
): Promise<{ core: Record<string, unknown>; extras: Record<string, unknown> }> {
  const taxonomyId = await createFreeTaxonomy(db, input.categoryId, {
    order: input.orden,
    family: input.familia,
    subfamily: input.subfamilia,
    genus: input.genero,
    species: input.especie,
  });

  const { data: cat } = await db
    .from('categories')
    .select('category_name')
    .eq('id', input.categoryId)
    .maybeSingle();

  const { data: reg } = await db
    .from('global_regions')
    .select('region_name, name, country, locality')
    .eq('id', input.regionId)
    .maybeSingle();

  const core = buildLiveCore(input, {
    taxonomyId,
    // Preferir REGION geográfica Cloudinary; fallback a global_regions.
    regionText:
      input.geoRegionFolder?.trim() ||
      reg?.region_name ||
      reg?.name ||
      null,
    // Preferir categoría canónica del catálogo; fallback a categories.category_name.
    categoria:
      input.catalogueCategoria?.trim() || cat?.category_name || null,
    localidad: input.localidad?.trim() || reg?.locality || null,
  });
  const extras = buildOptionalExtras(input);
  return { core, extras };
}

export async function createSpecimenAction(
  _prevState: SpecimenFormState,
  formData: FormData,
): Promise<SpecimenFormState> {
  await requireAdmin();

  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  const db = getSupabaseAdmin();
  let rows: { core: Record<string, unknown>; extras: Record<string, unknown> };
  try {
    rows = await buildRows(db, input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error de taxonomía' };
  }

  const result = await upsertWithSoftExtras(db, 'insert', null, rows.core, rows.extras);
  if (result.error || !result.id) return { error: result.error ?? 'No se pudo crear' };

  revalidatePath('/admin/especimenes');
  redirect(`/admin/especimenes/${result.id}?grabado=1`);
}

export async function updateSpecimenAction(
  specimenId: string,
  _prevState: SpecimenFormState,
  formData: FormData,
): Promise<SpecimenFormState> {
  await requireAdmin();

  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  const db = getSupabaseAdmin();
  let rows: { core: Record<string, unknown>; extras: Record<string, unknown> };
  try {
    rows = await buildRows(db, input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error de taxonomía' };
  }

  const result = await upsertWithSoftExtras(db, 'update', specimenId, rows.core, rows.extras);
  if (result.error) return { error: result.error };

  revalidatePath('/admin/especimenes');
  revalidatePath(`/admin/especimenes/${specimenId}`);
  redirect(`/admin/especimenes/${specimenId}?grabado=1`);
}
