'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { nextSpecimenCode } from '@/lib/codes/sequence';
import { createFreeTaxonomy } from '@/lib/sync/resolveTaxonomy';
import { GRADE_OPTIONS } from '@/lib/constants/grades';

export async function generateSpecimenCodeAction(regionCode: string): Promise<string> {
  await requireAdmin();
  return nextSpecimenCode(regionCode);
}

// z.coerce.number() coacciona "" a 0 (no a NaN), así que un campo numérico
// opcional dejado en blanco NO caería en `.optional()` sin este preprocess.
const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().optional(),
);
const optionalPositiveNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().positive().optional(),
);
const optionalPositiveInt = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().int().positive().optional(),
);

const SpecimenSchema = z
  .object({
    specimenCode: z.string().min(3, 'Código requerido'),
    categoryId: z.string().uuid('Selecciona una categoría'),
    regionId: z.string().uuid('Selecciona una región'),
    specimenKind: z.enum(['dried_specimen', 'zoology_skeleton', 'plant']),
    familia: z.string().optional(),
    familiaSanityId: z.string().optional(),
    subfamilia: z.string().optional(),
    subfamiliaSanityId: z.string().optional(),
    genero: z.string().min(1, 'El género es obligatorio'),
    generoSanityId: z.string().optional(),
    especie: z.string().min(1, 'La especie es obligatoria'),
    especieSanityId: z.string().optional(),
    gradeCode: z.string().optional(),
    commonName: z.string().optional(),
    sex: z.string().optional(),
    wingspanMm: optionalNumber,
    countryOrigin: z.string().optional(),
    stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo'),
    retailPrice: z.coerce.number().positive('El precio minorista debe ser positivo'),
    wholesalePrice: optionalPositiveNumber,
    wholesaleMinQty: optionalPositiveInt,
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

async function resolveTaxonomyForSubmission(
  db: ReturnType<typeof getSupabaseAdmin>,
  categoryId: string,
  input: SpecimenInput,
): Promise<string> {
  return createFreeTaxonomy(db, categoryId, {
    family: input.familia,
    subfamily: input.subfamilia,
    genus: input.genero,
    species: input.especie,
  });
}

function buildAttributes(input: SpecimenInput, existing: Record<string, unknown> = {}): Record<string, unknown> {
  const attributes: Record<string, unknown> = { ...existing, specimen_kind: input.specimenKind };

  if (input.commonName) attributes.common_name = input.commonName;
  else delete attributes.common_name;

  if (input.sex) attributes.sex = input.sex;
  else delete attributes.sex;

  if (input.gradeCode) {
    attributes.grade_code = input.gradeCode;
    const grade = GRADE_OPTIONS.find((g) => g.code === input.gradeCode);
    if (grade) attributes.grade_name = grade.name;
  } else {
    delete attributes.grade_code;
    delete attributes.grade_name;
  }

  if (typeof input.wingspanMm === 'number') attributes.wingspan_mm = input.wingspanMm;
  else delete attributes.wingspan_mm;

  if (input.countryOrigin) attributes.country_origin = input.countryOrigin;
  else delete attributes.country_origin;

  return attributes;
}

function buildPricing(input: SpecimenInput): Record<string, unknown> {
  const pricing: Record<string, unknown> = { retail_price: input.retailPrice, currency: input.currency };
  if (typeof input.wholesalePrice === 'number') pricing.wholesale_price = input.wholesalePrice;
  if (typeof input.wholesaleMinQty === 'number') pricing.wholesale_min_qty = input.wholesaleMinQty;
  return pricing;
}

export async function createSpecimenAction(
  _prevState: SpecimenFormState,
  formData: FormData,
): Promise<SpecimenFormState> {
  await requireAdmin();

  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  const db = getSupabaseAdmin();
  const taxonomyId = await resolveTaxonomyForSubmission(db, input.categoryId, input);

  const { data, error } = await db
    .from('specimens')
    .insert({
      specimen_code: input.specimenCode,
      global_region_id: input.regionId,
      category_id: input.categoryId,
      taxonomy_id: taxonomyId,
      pricing: buildPricing(input),
      stock: input.stock,
      attributes: buildAttributes(input),
      media_assets: [],
    })
    .select('id')
    .single();

  if (error) {
    return {
      error: error.message.toLowerCase().includes('duplicate')
        ? 'Ya existe un espécimen con ese código'
        : error.message,
    };
  }

  revalidatePath('/admin/especimenes');
  redirect(`/admin/especimenes/${data.id}`);
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

  const { data: current, error: fetchError } = await db
    .from('specimens')
    .select('attributes')
    .eq('id', specimenId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const taxonomyId = await resolveTaxonomyForSubmission(db, input.categoryId, input);

  const { error } = await db
    .from('specimens')
    .update({
      specimen_code: input.specimenCode,
      global_region_id: input.regionId,
      category_id: input.categoryId,
      taxonomy_id: taxonomyId,
      pricing: buildPricing(input),
      stock: input.stock,
      attributes: buildAttributes(input, (current?.attributes as Record<string, unknown>) ?? {}),
    })
    .eq('id', specimenId);

  if (error) {
    return {
      error: error.message.toLowerCase().includes('duplicate')
        ? 'Ya existe un espécimen con ese código'
        : error.message,
    };
  }

  revalidatePath('/admin/especimenes');
  revalidatePath(`/admin/especimenes/${specimenId}`);
  redirect(`/admin/especimenes/${specimenId}`);
}
