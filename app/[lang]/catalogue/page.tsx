import Header from '@/components/Header';
import CatalogBrowseShell from '@/components/catalogue/CatalogBrowseShell';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildRubroNodes,
  rubroEntryHref,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CatalogueHubPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const i18n = await getI18n(lang);
  const { specimens } = await loadCatalogueSpecimens();
  const nodes = buildRubroNodes(specimens);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
      <Header strings={i18n.strings} lang={i18n.locale} />
      <main className="pt-[104px]">
        <CatalogBrowseShell
          title={i18n.t('catalogue.rubros_title', 'Catálogo por rubro')}
          subtitle={i18n.t(
            'catalogue.rubros_subtitle',
            'Elige un rubro: primero categorías, luego catálogos (familias) y especies.'
          )}
          breadcrumbs={buildBreadcrumbs(i18n.locale, i18n.t, {})}
          nodes={nodes}
          hrefFor={(n) =>
            rubroEntryHref(
              i18n.locale,
              n.id,
              Boolean(n.videoPublicId?.trim())
            )
          }
        />
      </main>
    </div>
  );
}
