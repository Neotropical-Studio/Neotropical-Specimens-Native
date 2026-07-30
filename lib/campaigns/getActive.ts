// ============================================================================
// Campaña activa para el cintillo del storefront.
// Live: campaigns es stub (id, name) → no hay active/banner → siempre null
// hasta aplicar la sección B del SQL industrial.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

export interface ActiveCampaignBanner {
  id: string;
  title: string;
  banner: {
    headline?: { es?: string; en?: string };
    subheadline?: { es?: string; en?: string };
    ctaLabel?: { es?: string; en?: string };
    ctaHref?: string;
    imageCloudinaryId?: string;
    videoCloudinaryId?: string;
  };
  discountPercent: number | null;
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getActiveCampaign(
  _opts: { categorySlug?: string | null; regionCode?: string | null } = {},
): Promise<ActiveCampaignBanner | null> {
  const supabase = anonClient();
  if (!supabase) return null;

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title, banner, discount_percent, category_id, region_id')
    .eq('active', true)
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
    .order('priority', { ascending: false })
    .limit(1);

  // Stub live (solo id+name) → PostgREST error → sin cintillo (no romper portada).
  if (error || !data?.length) return null;

  const match = data[0];
  return {
    id: match.id as string,
    title: match.title as string,
    banner: (match.banner as ActiveCampaignBanner['banner']) ?? {},
    discountPercent: (match.discount_percent as number | null) ?? null,
  };
}
