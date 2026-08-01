import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import CatalogBrowseShell from '@/components/catalogue/CatalogBrowseShell';
import FamilyIntroGate from '@/components/catalogue/FamilyIntroGate';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildCategoryNodes,
  buildFamilyNodes,
  categoryFamiliesHref,
  familyEntryHref,
  findCategoryById,
  findCategoryBySlugOrLabel,
  findRegionById,
  findRegionBySlugOrFolder,
  findRubroById,
  regionCategoriesHref,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';
import type { InventoryRubroId } from '@/lib/specimens/rubros';

export const revalidate = 0;

export default async function CatalogueCategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{
    lang: string;
    rubro: string;
    region: string;
    categoria: string;
  }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const {
    lang,
    rubro: rubroParam,
    region: regionParam,
    categoria: catParam,
  } = await params;
  const { view } = await searchParams;
  const rubro = findRubroById(rubroParam);
  if (!rubro) notFound();

  const region =
    findRegionById(regionParam) ?? findRegionBySlugOrFolder(regionParam);
  const regionNode = region
    ? { id: region.id, label: region.folder }
    : rubro.id !== 'dried-specimens'
      ? { id: regionParam, label: regionParam }
      : null;
  if (!regionNode) notFound();

  const i18n = await getI18n(lang);
  const { specimens, error } = await loadCatalogueSpecimens();

  const known =
    findCategoryById(catParam) ?? findCategoryBySlugOrLabel(catParam);
  const categoryNodes = buildCategoryNodes(
    specimens,
    rubro.id as InventoryRubroId,
    regionNode.id,
  );
  const fromInventory = categoryNodes.find(
    (n) => n.id === catParam || n.id === known?.id,
  );
  const category = known
    ? { id: known.id, label: known.label, rubroId: known.rubroId }
    : fromInventory
      ? {
          id: fromInventory.id,
          label: fromInventory.label,
          rubroId: rubro.id as InventoryRubroId,
        }
      : null;
  if (!category || category.rubroId !== rubro.id) notFound();

  const categoryMedia =
    fromInventory ?? categoryNodes.find((n) => n.id === category.id);
  const videoPublicId = categoryMedia?.videoPublicId?.trim() || null;
  // Tras video de categoría → SIEMPRE grid de familias (?view=families), nunca especies.
  const showIntro = Boolean(videoPublicId) && view !== 'families';
  const familiesHref = categoryFamiliesHref(i18n.locale, {
    rubro: rubro.id,
    region: regionNode.id,
    categoria: category.id,
  });
  const categoriesHref = regionCategoriesHref(i18n.locale, {
    rubro: rubro.id,
    region: regionNode.id,
  });
  const backToRegionLabel = i18n.t(
    'catalogue.back_to_region_categories',
    `← Volver a categorías · ${regionNode.label}`,
  );

  if (showIntro && videoPublicId) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
        <Header strings={i18n.strings} lang={i18n.locale} />
        <main className="pt-[104px]">
          <FamilyIntroGate
            familyId={category.id}
            familyLabel={category.label}
            videoPublicId={videoPublicId}
            coverPublicId={categoryMedia?.coverPublicId}
            catalogHref={familiesHref}
            backHref={categoriesHref}
            backLabel={backToRegionLabel}
            skipLabel={i18n.t('catalogue.skip_to_families', 'Ver familias')}
            hintLabel={i18n.t(
              'catalogue.category_intro_hint',
              `Al terminar o saltar entrarás a las familias de ${category.label}.`,
            )}
            footerLabel={i18n.t(
              'catalogue.category_intro_footer',
              `Siguiente: familias de ${category.label}.`,
            )}
          />
        </main>
      </div>
    );
  }

  // ?view=families (o sin video): grid de familias. No especies aquí.
  // Industrial: nunca tumbar storefront si falta tabla / falla DB.
  let familyEntries: Array<{ label: string; folder: string }> | undefined;
  try {
    const { familyEntriesForScope } = await import(
      '@/lib/specimens/catalogueFamilyOverrides'
    );
    familyEntries = await familyEntriesForScope(regionNode.id, category.id);
  } catch {
    familyEntries = undefined; // buildFamilyNodes → EXPECTED_* bootstrap
  }
  const nodes = buildFamilyNodes(
    specimens,
    rubro.id as InventoryRubroId,
    regionNode.id,
    category.id,
    familyEntries,
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
          title={category.label}
          subtitle={i18n.t(
            'catalogue.families_subtitle',
            `Familias de ${category.label}. Elige una familia para ver su catálogo.`,
          )}
          backHref={categoriesHref}
          backLabel={backToRegionLabel}
          breadcrumbs={buildBreadcrumbs(i18n.locale, i18n.t, {
            rubro: {
              id: rubro.id,
              label: i18n.t('catalogue.regions_title', 'Regiones'),
            },
            region: { id: regionNode.id, label: rubro.label },
            categoria: { id: category.id, label: category.label },
          })}
          nodes={nodes}
          hrefFor={(n) =>
            familyEntryHref(
              i18n.locale,
              {
                rubro: rubro.id,
                region: regionNode.id,
                categoria: category.id,
                familia: n.id,
              },
              Boolean(n.videoPublicId?.trim()),
            )
          }
          showCardVideo
          childLabel={i18n.t('catalogue.specimens', 'especímenes')}
          emptyMessage={i18n.t(
            'catalogue.empty_families',
            'No hay familias en esta categoría todavía. La estructura está lista para crecer.',
          )}
        />
      </main>
    </div>
  );
}
