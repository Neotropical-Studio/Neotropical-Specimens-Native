// app/[lang]/product/[id]/page.tsx
// Ficha de producto dinámica y agnóstica. Server component: resuelve idioma
// (Sanity + MT), carga el espécimen (Supabase), deriva la paleta taxonómica y
// el contexto geo (divisa + regulación), e inyecta variables CSS sin FOUC.
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import CameleonThemeStyle from '@/components/CameleonThemeStyle';
import SpecimenDetail from '@/components/SpecimenDetail';
import { getI18n } from '@/lib/i18n/index';
import { getSpecimenById } from '@/lib/specimens/detail';
import { resolveTaxonPalette } from '@/lib/theme/taxon';
import { resolveRegulatory } from '@/lib/geo/regulations';
import { getActiveCampaign } from '@/lib/campaigns/getActive';

export const revalidate = 0; // siempre fresco (inventario dinámico)

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  // i18n normaliza a un idioma habilitado (o al default) y trae el mapa de
  // cadenas ya resuelto (autorizadas en Sanity + fallback de traducción).
  const i18n = await getI18n(lang);

  const specimen = await getSpecimenById(id, i18n.locale);
  if (!specimen) notFound();

  // Contexto geo propagado por el middleware (borde).
  const h = await headers();
  const country = h.get('x-geo-country');
  const currency = h.get('x-currency') ?? specimen.currency ?? 'USD';
  const regulatory = resolveRegulatory(country && country !== 'XX' ? country : null);

  // Oferta de campaña activa (tabla `campaigns`), acotada por región si aplica.
  const campaign = await getActiveCampaign({ regionCode: specimen.regionName });

  // Paleta camaleónica: override del espécimen → taxonomía → default.
  const palette = resolveTaxonPalette({
    order: specimen.order,
    family: specimen.family,
    subfamily: specimen.subfamily,
    override: specimen.themeOverride,
  });

  return (
    <>
      {/* Variables CSS críticas inline para eliminar el parpadeo de tema */}
      <CameleonThemeStyle source={palette as unknown as Record<string, unknown>} />
      <SpecimenDetail
        specimen={specimen}
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
