// app/[lang]/page.tsx — Portada: Hero + 5 ventanas de categoría; al elegir
// una se siguen las familias en el flujo jerárquico normal del catálogo.
import { headers } from 'next/headers';
import CampaignBanner from '@/components/CampaignBanner';
import Header from '@/components/Header';
import LiveShowcase from '@/components/LiveShowcase';
import { getI18n } from '@/lib/i18n/index';
import { loadHomeShowcaseSpecimens } from '@/lib/specimens/loadHomeShowcase';

// Regenerativo con cache corto en loadHomeShowcase (45s) — no CDN HTML estático.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  const [i18n, { specimens, error }, hdrs] = await Promise.all([
    getI18n(lang),
    loadHomeShowcaseSpecimens(),
    headers(),
  ]);
  const country = hdrs.get('x-geo-country');

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
