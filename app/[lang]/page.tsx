// app/[lang]/page.tsx — Portada dinámica: consume specimens desde Supabase en
// tiempo real (sincronizados vía n8n desde Sanity/Cloudinary). Sin datos ni
// textos en el repo: el idioma llega por ruta y las cadenas por getI18n.
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import CampaignBanner from '@/components/CampaignBanner';
import Header from '@/components/Header';
import LiveShowcase from '@/components/LiveShowcase';
import { getI18n } from '@/lib/i18n/index';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView } from '@/lib/specimens/view';

export const revalidate = 0; // siempre fresco (dinámico)

async function loadSpecimens() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return { rows: [], error: 'Supabase no configurado' };

  return loadCatalogRows(createClient(url, key));
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const i18n = await getI18n(lang);

  const { rows, error } = await loadSpecimens();
  const specimens = rows.map(toSpecimenView);
  const country = (await headers()).get('x-geo-country');

  return (
    <>
      <Header strings={i18n.strings} />
      <main className="min-h-screen bg-surface pt-[104px] text-text-dynamic">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <CampaignBanner lang={i18n.locale} />
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-7xl px-4">
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
              {i18n.t('system.inventory_error', 'No se pudo cargar el inventario en vivo')}: {error}
            </div>
          </div>
        )}

        {/* Hero + catálogo: un solo stream vivo. Empty states si no hay data;
            aparición automática al subir productos reales (Cloudinary/Supabase). */}
        <LiveShowcase
          initial={specimens}
          strings={i18n.strings}
          lang={i18n.locale}
          country={country && country !== 'XX' ? country : null}
        />
      </main>
    </>
  );
}
