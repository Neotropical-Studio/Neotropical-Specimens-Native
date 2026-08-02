import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import CatalogBackLink from '@/components/catalogue/CatalogBackLink';
import CatalogSpeciesPager from '@/components/catalogue/CatalogSpeciesPager';
import FamilyIntroGate from '@/components/catalogue/FamilyIntroGate';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildCategoryNodes,
  buildFamilyNodes,
  categoryFamiliesHref,
  familyCatalogHref,
  filterSpecimensByFamily,
  findCategoryById,
  findCategoryBySlugOrLabel,
  findRegionById,
  findRegionBySlugOrFolder,
  findRubroById,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';
import type { InventoryRubroId } from '@/lib/specimens/rubros';
import { catalogueSpeciesPerPage } from '@/lib/specimens/cataloguePagination';

export const revalidate = 0;

export default async function CatalogueFamiliaPage({
  params,
  searchParams,
}: {
  params: Promise<{
    lang: string;
    rubro: string;
    region: string;
    categoria: string;
    familia: string;
  }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const {
    lang,
    rubro: rubroParam,
    region: regionParam,
    categoria: catParam,
    familia: familiaParam,
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

  let familyEntries: Array<{ label: string; folder: string }> | undefined;
  try {
    const { familyEntriesForScope } = await import(
      '@/lib/specimens/catalogueFamilyOverrides'
    );
    familyEntries = await familyEntriesForScope(regionNode.id, category.id);
  } catch {
    familyEntries = undefined;
  }
  const familyNodes = buildFamilyNodes(
    specimens,
    rubro.id as InventoryRubroId,
    regionNode.id,
    category.id,
    familyEntries,
  );
  const familyNode = familyNodes.find((n) => n.id === familiaParam);
  if (!familyNode) notFound();

  const familyParts = {
    rubro: rubro.id,
    region: regionNode.id,
    categoria: category.id,
    familia: familyNode.id,
  };
  const catalogHref = familyCatalogHref(i18n.locale, familyParts);
  const familiesHref = categoryFamiliesHref(i18n.locale, {
    rubro: rubro.id,
    region: regionNode.id,
    categoria: category.id,
  });
  const backToCategoryLabel = i18n.t(
    'catalogue.back_to_families_catalog',
    `← Volver al catálogo de familias · ${category.label}`,
  );
  const showIntro =
    Boolean(familyNode.videoPublicId?.trim()) && view !== 'catalog';

  const list = filterSpecimensByFamily(
    specimens,
    rubro.id as InventoryRubroId,
    regionNode.id,
    category.id,
    familyNode.id,
  );

  if (showIntro && familyNode.videoPublicId) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
        <Header strings={i18n.strings} lang={i18n.locale} />
        <main className="pt-[104px]">
          <FamilyIntroGate
            familyId={familyNode.id}
            familyLabel={familyNode.label}
            videoPublicId={familyNode.videoPublicId}
            coverPublicId={familyNode.coverPublicId}
            catalogHref={catalogHref}
            backHref={familiesHref}
            backLabel={backToCategoryLabel}
            skipLabel={i18n.t('catalogue.skip_to_catalog', 'Ver catálogo')}
            hintLabel={i18n.t(
              'catalogue.family_intro_hint',
              `Al terminar o saltar entrarás al catálogo solo de ${familyNode.label} (${rubro.label} · ${regionNode.label} · ${category.label}).`,
            )}
          />
        </main>
      </div>
    );
  }

  const crumbs = buildBreadcrumbs(i18n.locale, i18n.t, {
    rubro: {
      id: rubro.id,
      label: i18n.t('catalogue.regions_title', 'Regiones'),
    },
    region: { id: regionNode.id, label: rubro.label },
    categoria: { id: category.id, label: category.label },
    familia: { id: familyNode.id, label: familyNode.label },
  });

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
      <Header strings={i18n.strings} lang={i18n.locale} />
      <main className="pt-[104px]">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <CatalogBackLink href={familiesHref} label={backToCategoryLabel} />
          </div>

          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/45"
          >
            {crumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
                {i > 0 ? <span className="text-white/20">/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-emerald-300">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/70">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <header className="mb-8 max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {familyNode.label}
            </h1>
            <p className="mt-2 text-sm text-white/55">
              {list.length}{' '}
              {i18n.t('catalogue.specimens', 'especímenes')} ·{' '}
              {catalogueSpeciesPerPage()} {i18n.t('catalogue.per_page', 'por página')} ·{' '}
              {i18n.t('catalogue.family_scope', 'solo esta familia')}
            </p>
          </header>

          {error ? (
            <p className="mb-4 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {list.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/50">
              {i18n.t(
                'catalogue.empty_species',
                'No hay especies en esta familia todavía.',
              )}
            </p>
          ) : (
            <CatalogSpeciesPager
              specimens={list}
              strings={i18n.strings}
              lang={i18n.locale}
              returnFamilyHref={catalogHref}
              returnFamilyLabel={familyNode.label}
              returnCategoryHref={familiesHref}
              returnCategoryLabel={category.label}
            />
          )}

          <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
            <CatalogBackLink href={familiesHref} label={backToCategoryLabel} />
          </div>
        </div>
      </main>
    </div>
  );
}
