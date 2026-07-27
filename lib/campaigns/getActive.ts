// ============================================================================
// Campaña activa para el cintillo del storefront (Sección 3). Sin caché: la
// portada ya es `revalidate = 0`, así que activar/cerrar una campaña sólo
// requiere cambiar sus fechas — sin cron, sin invalidación manual.
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
  opts: { categorySlug?: string | null; regionCode?: string | null } = {},
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
    .limit(10);

  if (error || !data?.length) return null;

  let categoryId: string | null = null;
  let regionId: string | null = null;

  if (opts.categorySlug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', opts.categorySlug).maybeSingle();
    categoryId = (cat?.id as string) ?? null;
  }
  if (opts.regionCode) {
    const { data: reg } = await supabase
      .from('global_regions')
      .select('id')
      .eq('region_name', opts.regionCode)
      .maybeSingle();
    regionId = (reg?.id as string) ?? null;

    if (!regionId) {
      const { data: fallbackRegion } = await supabase
        .from('global_regions')
        .select('id')
        .eq('name', opts.regionCode)
        .maybeSingle();
      regionId = (fallbackRegion?.id as string) ?? null;
    }
  }

  const match = data.find(
    (c) => (!c.category_id || c.category_id === categoryId) && (!c.region_id || c.region_id === regionId),
  );
  if (!match) return null;

  return {
    id: match.id as string,
    title: match.title as string,
    banner: (match.banner as ActiveCampaignBanner['banner']) ?? {},
    discountPercent: (match.discount_percent as number | null) ?? null,
  };
}
