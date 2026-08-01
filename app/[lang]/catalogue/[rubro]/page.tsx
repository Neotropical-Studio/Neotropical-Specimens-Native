import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import CatalogBrowseShell from '@/components/catalogue/CatalogBrowseShell';
import FamilyIntroGate from '@/components/catalogue/FamilyIntroGate';
import { getI18n } from '@/lib/i18n/index';
import {
  buildBreadcrumbs,
  buildRegionNodes,
  buildRubroNodes,
  catalogueHref,
  findRubroById,
  regionEntryHref,
  rubroRegionsHref,
} from '@/lib/specimens/catalogueNav';
import { loadCatalogueSpecimens } from '@/lib/specimens/loadCatalogue';
import type { InventoryRubroId } from '@/lib/specimens/rubros';

export const revalidate = 0;

export default async function CatalogueRubroPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; rubro: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { lang, rubro: rubroParam } = await params;
  const { view } = await searchParams;
  const rubro = findRubroById(rubroParam);
  if (!rubro) notFound();

  const i18n = await getI18n(lang);
  const { specimens, error } = await loadCatalogueSpecimens();

  const rubroMedia = buildRubroNodes(specimens).find((n) => n.id === rubro.id);
  const videoPublicId = rubroMedia?.videoPublicId?.trim() || null;
  const showIntro = Boolean(videoPublicId) && view !== 'regions';

  const regionsHref = rubroRegionsHref(i18n.locale, rubro.id);
  const catalogueRootHref = catalogueHref(i18n.locale, {});
  const backToCatalogueLabel = i18n.t(
    'catalogue.back_to_catalogue',
    '← Volver al Catálogo',
  );

  if (showIntro && videoPublicId) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text-dynamic)]">
        <Header strings={i18n.strings} lang={i18n.locale} />
        <main className="pt-[104px]">
          <FamilyIntroGate
            familyId={rubro.id}
            familyLabel={rubro.label}
            videoPublicId={videoPublicId}
            coverPublicId={rubroMedia?.coverPublicId}
            catalogHref={regionsHref}
            backHref={catalogueRootHref}
            backLabel={backToCatalogueLabel}
            skipLabel={i18n.t('catalogue.skip_to_regions', 'Ver regiones')}
            hintLabel={i18n.t(
              'catalogue.rubro_intro_hint',
              `Al terminar o saltar entrarás a las regiones de ${rubro.label}.`,
            )}
            footerLabel={i18n.t(
              'catalogue.rubro_intro_footer',
              `Siguiente: regiones / categorías de ${rubro.label}.`,
            )}
          />
        </main>
      </div>
    );
  }

  const nodes = buildRegionNodes(specimens, rubro.id as InventoryRubroId);

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
          title={i18n.t('catalogue.regions_title', 'Regiones')}
          subtitle={i18n.t(
            'catalogue.regions_subtitle',
            'Elige una región para ver sus categorías.',
          )}
          lead={i18n.t(
            'catalogue.search_below_world_regions',
            'SEARCH BELOW WORLD REGIONS',
          )}
          backHref={catalogueRootHref}
          backLabel={backToCatalogueLabel}
          entryCoverPublicId={rubroMedia?.coverPublicId?.trim() || null}
          entryVideoPublicId={videoPublicId}
          breadcrumbs={buildBreadcrumbs(i18n.locale, i18n.t, {
            rubro: {
              id: rubro.id,
              label: i18n.t('catalogue.regions_title', 'Regiones'),
            },
          })}
          nodes={nodes}
          hrefFor={(n) =>
            regionEntryHref(
              i18n.locale,
              { rubro: rubro.id, region: n.id },
              Boolean(n.videoPublicId?.trim()),
            )
          }
          showCardVideo
          childLabel={i18n.t('catalogue.specimens', 'especímenes')}
          emptyMessage={i18n.t(
            'catalogue.empty_regions',
            'Aún no hay regiones disponibles en este rubro.',
          )}
        />
      </main>
    </div>
  );
}
