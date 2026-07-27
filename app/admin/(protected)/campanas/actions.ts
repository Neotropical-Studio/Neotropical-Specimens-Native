'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';

const optionalPercent = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().min(0).max(100).optional(),
);

const CampaignSchema = z
  .object({
    title: z.string().min(1, 'Título requerido'),
    headlineEs: z.string().optional(),
    headlineEn: z.string().optional(),
    subheadlineEs: z.string().optional(),
    subheadlineEn: z.string().optional(),
    ctaLabelEs: z.string().optional(),
    ctaLabelEn: z.string().optional(),
    ctaHref: z.string().optional(),
    imageCloudinaryId: z.string().optional(),
    videoCloudinaryId: z.string().optional(),
    discountPercent: optionalPercent,
    categoryId: z.string().optional(),
    regionId: z.string().optional(),
    startsAt: z.string().min(1, 'Fecha de inicio requerida'),
    endsAt: z.string().min(1, 'Fecha de cierre requerida'),
    priority: z.coerce.number().int().default(0),
    active: z.enum(['on']).optional(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'La fecha de cierre debe ser posterior a la de inicio',
    path: ['endsAt'],
  });

type CampaignInput = z.infer<typeof CampaignSchema>;

export interface CampaignFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData): { data?: CampaignInput; state?: CampaignFormState } {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CampaignSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { state: { error: 'Revisa los campos marcados', fieldErrors } };
  }
  return { data: parsed.data };
}

function buildRow(input: CampaignInput) {
  const banner: Record<string, unknown> = {};

  const headline: Record<string, string> = {};
  if (input.headlineEs) headline.es = input.headlineEs;
  if (input.headlineEn) headline.en = input.headlineEn;
  if (Object.keys(headline).length) banner.headline = headline;

  const subheadline: Record<string, string> = {};
  if (input.subheadlineEs) subheadline.es = input.subheadlineEs;
  if (input.subheadlineEn) subheadline.en = input.subheadlineEn;
  if (Object.keys(subheadline).length) banner.subheadline = subheadline;

  const ctaLabel: Record<string, string> = {};
  if (input.ctaLabelEs) ctaLabel.es = input.ctaLabelEs;
  if (input.ctaLabelEn) ctaLabel.en = input.ctaLabelEn;
  if (Object.keys(ctaLabel).length) banner.ctaLabel = ctaLabel;

  if (input.ctaHref) banner.ctaHref = input.ctaHref;
  if (input.imageCloudinaryId) banner.imageCloudinaryId = input.imageCloudinaryId;
  if (input.videoCloudinaryId) banner.videoCloudinaryId = input.videoCloudinaryId;

  return {
    title: input.title,
    banner,
    discount_percent: input.discountPercent ?? null,
    category_id: input.categoryId || null,
    region_id: input.regionId || null,
    starts_at: new Date(input.startsAt).toISOString(),
    ends_at: new Date(input.endsAt).toISOString(),
    priority: input.priority,
    active: input.active === 'on',
  };
}

export async function createCampaignAction(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const admin = await requireAdmin();
  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  const db = getSupabaseAdmin();
  const { error } = await db.from('campaigns').insert({ ...buildRow(input), created_by: admin.id });
  if (error) return { error: error.message };

  revalidatePath('/admin/campanas');
  revalidatePath('/');
  redirect('/admin/campanas');
}

export async function updateCampaignAction(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  await requireAdmin();
  const { data: input, state } = parseForm(formData);
  if (!input) return state!;

  const db = getSupabaseAdmin();
  const { error } = await db.from('campaigns').update(buildRow(input)).eq('id', campaignId);
  if (error) return { error: error.message };

  revalidatePath('/admin/campanas');
  revalidatePath('/');
  redirect('/admin/campanas');
}
