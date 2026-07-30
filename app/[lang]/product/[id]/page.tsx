// app/[lang]/product/[id]/page.tsx
// Ficha de producto: catálogo vivo + blindaje Morpho godarty didius tingomarensis.
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import CameleonThemeStyle from '@/components/CameleonThemeStyle';
import Header from '@/components/Header';
import SpecimenDetail from '@/components/SpecimenDetail';
import { getI18n } from '@/lib/i18n/index';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import {
  buildMorphoGodartyDetailView,
  getSpecimenById,
  sealMorphoDetailView,
  toSpecimenDetail,
  type SpecimenDetailView,
} from '@/lib/specimens/detail';
import { pickRelatedSpecimens } from '@/lib/specimens/related';
import { resolveTaxonPalette } from '@/lib/theme/taxon';
import { resolveRegulatory } from '@/lib/geo/regulations';
import { getActiveCampaign, type ActiveCampaignBanner } from '@/lib/campaigns/getActive';
import {
  isMorphoGodartyDidiusTingomarensis,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID,
  MORPHO_GODARTY_NATIVE,
} from '@/lib/specimens/native/morphoGodartyDidiusTingomarensis';

export const revalidate = 0; // siempre fresco (inventario dinámico)

const MORPHO_NATIVE_CAMPAIGN: ActiveCampaignBanner = {
  id: 'native-morpho-godarty-tingo',
  title: MORPHO_GODARTY_NATIVE.campaignTitle,
  banner: {},
  discountPercent: MORPHO_GODARTY_NATIVE.campaignDiscountPercent,
};

async function loadRelatedCatalog(
  current: SpecimenDetailView,
  lang: string,
): Promise<SpecimenDetailView[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return pickRelatedSpecimens([current], current);

  try {
    const { rows } = await loadCatalogRows(createClient(url, key));
    const pool = rows.map((row) => {
      const detail = toSpecimenDetail(row, lang);
      return isMorphoGodartyDidiusTingomarensis({
        id: detail.id,
        scientificName: detail.scientificName,
      })
        ? sealMorphoDetailView(detail)
        : detail;
    });
    if (!pool.some((item) => item.id === current.id)) {
      pool.unshift(current);
    }
    return pickRelatedSpecimens(pool, current);
  } catch {
    return pickRelatedSpecimens([current], current);
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  const i18n = await getI18n(lang);

  const isMorphoRoute =
    id === MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID ||
    isMorphoGodartyDidiusTingomarensis({ id });

  let specimen =
    (await getSpecimenById(id, i18n.locale)) ??
    (isMorphoRoute ? buildMorphoGodartyDetailView() : null);

  if (!specimen) notFound();

  if (
    isMorphoGodartyDidiusTingomarensis({
      id: specimen.id,
      scientificName: specimen.scientificName,
    })
  ) {
    specimen = sealMorphoDetailView(specimen);
  }

  const relatedCatalog = await loadRelatedCatalog(specimen, i18n.locale);

  const h = await headers();
  const country = h.get('x-geo-country');
  const currency = h.get('x-currency') ?? specimen.currency ?? 'USD';
  const regulatory = resolveRegulatory(country && country !== 'XX' ? country : null);

  let campaign = await getActiveCampaign({
    regionCode: specimen.regionCode ?? specimen.regionName,
  });
  if (
    !campaign &&
    isMorphoGodartyDidiusTingomarensis({
      id: specimen.id,
      scientificName: specimen.scientificName,
    })
  ) {
    campaign = MORPHO_NATIVE_CAMPAIGN;
  }

  const palette = resolveTaxonPalette({
    order: specimen.order,
    family: specimen.family,
    subfamily: specimen.subfamily,
    override: specimen.themeOverride,
  });

  const geoCountry = regulatory.country ?? 'PE';

  return (
    <>
      <CameleonThemeStyle source={palette as unknown as Record<string, unknown>} />
      <Header strings={i18n.strings} lang={i18n.locale} country={geoCountry} />
      <SpecimenDetail
        specimen={specimen}
        relatedCatalog={relatedCatalog}
        strings={i18n.strings}
        lang={i18n.locale}
        dir={i18n.dir}
        locale={i18n.locale}
        currency={currency}
        palette={palette}
        regulatory={regulatory}
        campaign={campaign}
      />
    </>
  );
}
