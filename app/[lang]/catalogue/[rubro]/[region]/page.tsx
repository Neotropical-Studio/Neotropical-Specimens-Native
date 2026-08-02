import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import CatalogBrowseShell from '@/components/catalogue/CatalogBrowseShell';
import FamilyIntroGate from '@/components/catalogue/FamilyIntroGate';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildCategoryNodes,
  buildRegionNodes,
  categoryEntryHref,
  findRegionById,
  findRegionBySlugOrFolder,
  findRubroById,
  regionCategoriesHref,
  rubroRegionsHref,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';
import type { InventoryRubroId } from '@/lib/specimens/rubros';

export const revalidate = 0;

export default async function CatalogueRegionPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; rubro: string; region: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { lang, rubro: rubroParam, region: regionParam } = await params;
  const { view } = await searchParams;
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

  const regionMedia = buildRegionNodes(
    specimens,
    rubro.id as InventoryRubroId,
  ).find((n) => n.id === regionNode.id);
  const videoPublicId = regionMedia?.videoPublicId?.trim() || null;
  const showIntro = Boolean(videoPublicId) && view !== 'categories';
  const categoriesHref = regionCategoriesHref(i18n.locale, {
    rubro: rubro.id,
    region: regionNode.id,
  });
  const regionsHref = rubroRegionsHref(i18n.locale, rubro.id);
  const backToRegionsLabel = i18n.t(
    'catalogue.back_to_regions',
    '← Volver a Regiones',
  );

  if (showIntro && videoPublicId) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
        <Header strings={i18n.strings} lang={i18n.locale} />
        <main className="pt-[104px]">
          <FamilyIntroGate
            familyId={regionNode.id}
            familyLabel={regionNode.label}
            videoPublicId={videoPublicId}
            coverPublicId={regionMedia?.coverPublicId}
            catalogHref={categoriesHref}
            backHref={regionsHref}
            backLabel={backToRegionsLabel}
            skipLabel={i18n.t('catalogue.skip_to_categories', 'Ver categorías')}
            hintLabel={i18n.t(
              'catalogue.region_intro_hint',
              `Al terminar o saltar entrarás a las categorías de ${regionNode.label}.`,
            )}
            footerLabel={i18n.t(
              'catalogue.region_intro_footer',
              `Siguiente: categorías de ${regionNode.label}.`,
            )}
          />
        </main>
      </div>
    );
  }

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
          title={rubro.label}
          subtitle={`${regionNode.label} · ${i18n.t(
            'catalogue.categories_subtitle',
            'Elige una categoría para ver sus familias.',
          )}`}
          backHref={regionsHref}
          backLabel={backToRegionsLabel}
          entryCoverPublicId={regionMedia?.coverPublicId?.trim() || null}
          entryVideoPublicId={videoPublicId}
          breadcrumbs={buildBreadcrumbs(i18n.locale, i18n.t, {
            rubro: {
              id: rubro.id,
              label: i18n.t('catalogue.regions_title', 'Regiones'),
            },
            region: { id: regionNode.id, label: rubro.label },
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
