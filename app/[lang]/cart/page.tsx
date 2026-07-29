import { headers } from 'next/headers';
import Header from '@/components/Header';
import CartView from '@/components/CartView';
import { getI18n } from '@/lib/i18n/index';
import { resolveRegulatory } from '@/lib/geo/regulations';

export const revalidate = 0;

export default async function CartPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const i18n = await getI18n(lang);
  const h = await headers();
  const country = h.get('x-geo-country');
  const regulatory = resolveRegulatory(country && country !== 'XX' ? country : null);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-slate-100">
      <Header strings={i18n.strings} lang={lang} />
      <main className="pt-[calc(68px+2.5rem)] pb-16">
        <CartView
          lang={lang}
          locale={i18n.locale}
          country={regulatory.country ?? 'PE'}
          strings={i18n.strings}
        />
      </main>
    </div>
  );
}
