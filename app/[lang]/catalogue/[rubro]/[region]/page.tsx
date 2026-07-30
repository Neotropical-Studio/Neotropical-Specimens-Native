import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import CatalogBrowseShell from '@/components/catalogue/CatalogBrowseShell';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildCategoryNodes,
  categoryEntryHref,
  findRegionById,
  findRegionBySlugOrFolder,
  findRubroById,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';
import type { InventoryRubroId } from '@/lib/specimens/rubros';

export const revalidate = 0;

export default async function CatalogueRegionPage({
  params,
}: {
  params: Promise<{ lang: string; rubro: string; region: string }>;
}) {
  const { lang, rubro: rubroParam, region: regionParam } = await params;
  const rubro = findRubroById(rubroParam);
  if (!rubro) notFound();

  const region =
    findRegionById(regionParam) ?? findRegionBySlugOrFolder(regionParam);
  // Regiones canónicas (dried-specimens) o slug libre para otros rubros.
  const regionNode = region
    ? { id: region.id, label: region.folder }
    : rubro.id !== 'dried-specimens'
      ? { id: regionParam, label: regionParam }
      : null;
  if (!regionNode) notFound();

  const i18n = await getI18n(lang);
  const { specimens, error } = await loadCatalogueSpecimens();
  const nodes = buildCategoryNodes(
    specimens,
    rubro.id as InventoryRubroId,
    regionNode.id,
  );

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
      <Header strings={i18n.strings} lang={i18n.locale} />
      <main className="pt-[104px]">
        {error ? (
          <div className="mx-auto max-w-7xl px-4 pt-4">
            <p className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </p>
          </div>
        ) : null}
        <CatalogBrowseShell
          title={regionNode.label}
          subtitle={i18n.t(
            'catalogue.categories_subtitle',
            'Categorías bajo esta REGION. Card + video desde _card/_video de cada carpeta (Butterflies Diurne, Moths…).',
          )}
          breadcrumbs={buildBreadcrumbs(i18n.locale, i18n.t, {
            rubro: { id: rubro.id, label: rubro.label },
            region: { id: regionNode.id, label: regionNode.label },
          })}
          nodes={nodes}
          hrefFor={(n) =>
            categoryEntryHref(
              i18n.locale,
              {
                rubro: rubro.id,
                region: regionNode.id,
                categoria: n.id,
              },
              Boolean(n.videoPublicId?.trim()),
            )
          }
          showCardVideo
          childLabel={i18n.t('catalogue.specimens', 'especímenes')}
          emptyMessage={i18n.t(
            'catalogue.empty_categories',
            'No hay categorías en esta región todavía.',
          )}
        />
      </main>
    </div>
  );
}
