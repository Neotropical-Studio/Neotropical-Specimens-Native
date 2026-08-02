import Header from '@/components/Header';
import CatalogBrowseShell from '@/components/catalogue/CatalogBrowseShell';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildRubroNodes,
  rubroEntryHref,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';

export const revalidate = 0;

export default async function CatalogueHubPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const i18n = await getI18n(lang);
  const { specimens, error } = await loadCatalogueSpecimens();
  // Exactamente 3 cards = hijos Cloudinary RUBROS/ (dried-specimens, zoology-skeletons, dry-plants-no-cites).
  const nodes = buildRubroNodes(specimens);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
      <Header strings={i18n.strings} lang={i18n.locale} />
      <main className="pt-[104px]">
        {error ? (
          <div className="mx-auto max-w-7xl px-4 pt-4">
            <p className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {i18n.t('system.inventory_error', 'No se pudo cargar el inventario')}: {error}
            </p>
          </div>
        ) : null}
        <CatalogBrowseShell
          title={i18n.t('catalogue.rubros_title', 'Catálogo por rubro')}
          subtitle={i18n.t(
            'catalogue.rubros_subtitle',
            'Elige un rubro para explorar regiones, categorías y familias.',
          )}
          breadcrumbs={buildBreadcrumbs(i18n.locale, i18n.t, {})}
          nodes={nodes}
          hrefFor={(n) =>
            rubroEntryHref(
              i18n.locale,
              n.id,
              Boolean(n.videoPublicId?.trim()),
            )
          }
          showCardVideo
          childLabel={i18n.t('catalogue.specimens', 'especímenes')}
          emptyMessage={i18n.t(
            'catalogue.empty_rubros',
            'Aún no hay rubros con inventario sincronizado.',
          )}
        />
      </main>
    </div>
  );
}
