// app/[lang]/page.tsx — Portada dinámica: consume specimens desde Supabase en
// tiempo real (sincronizados vía n8n desde Sanity/Cloudinary). Sin datos ni
// textos en el repo: el idioma llega por ruta y las cadenas por getI18n.
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import CampaignBanner from '@/components/CampaignBanner';
import Header from '@/components/Header';
import Hero, { type HeroStats } from '@/components/Hero';
import LanguageRegenerativeBanner from '@/components/LanguageRegenerativeBanner';
import SpecimenExplorer from '@/components/SpecimenExplorer';
import { getI18n } from '@/lib/i18n/index';
import {
  attachMedia,
  fetchSpecimenMedia,
  SPECIMEN_SELECT,
  toSpecimenView,
  type SpecimenRow,
} from '@/lib/specimens/view';

export const revalidate = 0; // siempre fresco (dinámico)

async function loadSpecimens() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return { rows: [] as SpecimenRow[], error: 'Supabase no configurado' };

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as SpecimenRow[];

  // La multimedia se consulta aparte: `specimen_media` no tiene FK declarada
  // hacia `specimens`, así que no se puede incrustar vía select relacional.
  const mediaById = await fetchSpecimenMedia(supabase, rows.map((r) => r.id));

  return { rows: attachMedia(rows, mediaById), error: error?.message ?? null };
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const i18n = await getI18n(lang);

  const { rows, error } = await loadSpecimens();
  const specimens = rows.map(toSpecimenView);
  const country = (await headers()).get('x-geo-country');

  const stats: HeroStats = {
    specimens: specimens.length,
    families: new Set(specimens.map((s) => s.family).filter(Boolean)).size,
    regions: new Set(specimens.map((s) => s.regionCode).filter(Boolean)).size,
    countries: new Set(specimens.map((s) => s.country).filter(Boolean)).size,
  };

  return (
    <>
      <Header
        strings={i18n.strings}
        lang={i18n.locale}
        locales={i18n.enabledLocales}
      />
      <main className="min-h-screen bg-surface pt-[104px] text-text-dynamic">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <CampaignBanner lang={i18n.locale} />
          <LanguageRegenerativeBanner lang={i18n.locale} strings={i18n.strings} />
        </div>

        <Hero
          stats={stats}
          strings={i18n.strings}
          specimens={specimens}
          lang={i18n.locale}
          country={country && country !== 'XX' ? country : null}
        />

        {error && (
          <div className="mx-auto mb-6 max-w-7xl px-4">
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
              {i18n.t('system.inventory_error', 'No se pudo cargar el inventario en vivo')}: {error}
            </div>
          </div>
        )}

        <SpecimenExplorer initial={specimens} strings={i18n.strings} lang={i18n.locale} />
      </main>
    </>
  );
}
