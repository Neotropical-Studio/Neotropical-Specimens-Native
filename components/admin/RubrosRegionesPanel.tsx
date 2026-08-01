'use client';

import Link from 'next/link';
import { FolderTree, Globe2, Layers, Bug } from 'lucide-react';
import {
  BEETLES_CATEGORY_SEGMENT,
  BUTTERFLIES_CATEGORY_SEGMENT,
  CURRENT_CATEGORY_FOCUS,
  DRIED_SPECIMEN_CATEGORY_FOLDERS,
  EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
  EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
  EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
  EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
  EXPECTED_RARE_SUBFOLDERS,
  EXPECTED_SHARED_INSECTS_FAMILIES,
  GEOGRAPHIC_REGION_FOLDERS,
  INSECTS_CATEGORY_SEGMENT,
  INSECTS_DISPLAY_LABEL,
  MOTHS_CATEGORY_SEGMENT,
  MOTHS_DISPLAY_LABEL,
  NEOTROPICAL_RARE_GYNAN_ROOT,
  RARE_GYNAN_CATEGORY_SEGMENT,
  RARE_GYNAN_DISPLAY_LABEL,
  RARE_GYNAN_REGION_ROOTS,
  RUBRO_FOLDER,
  RUBROS_CHILD_FOLDERS,
  beetleFamiliesForRegion,
  insectFamiliesForRegion,
  mothFamiliesForRegion,
  rareGynanFamiliesForRegion,
  nodeCardFolder,
  nodeVideoFolder,
} from '@/scripts/sync-cloudinary/roots';
import { catalogueHref, slugifyCatalogue } from '@/lib/specimens/catalogueNav';

const RUBRO1 = RUBROS_CHILD_FOLDERS[0];
const RUBRO1_PATH = `RUBROS/${RUBRO_FOLDER}`;
const BUTTERFLIES_SEG = BUTTERFLIES_CATEGORY_SEGMENT;
const BEETLES_SEG = BEETLES_CATEGORY_SEGMENT;
const INSECTS_SEG = INSECTS_CATEGORY_SEGMENT;
const MOTHS_SEG = MOTHS_CATEGORY_SEGMENT;

type FamilyAccent = 'amber' | 'sky' | 'emerald' | 'violet' | 'rose';

function FamilyTaxonList({
  families,
  categoryPath,
  accent,
  title,
  catalogHref,
  regionId,
  categoryId,
}: {
  families: readonly string[];
  categoryPath: string;
  accent: FamilyAccent;
  title: string;
  catalogHref: string;
  regionId: string;
  categoryId: string;
}) {
  const chip =
    accent === 'amber'
      ? 'border-amber-700/70 bg-amber-950/50 text-amber-100 hover:border-amber-400 hover:bg-amber-900/60'
      : accent === 'sky'
        ? 'border-sky-700/70 bg-sky-950/50 text-sky-100 hover:border-sky-400 hover:bg-sky-900/60'
        : accent === 'violet'
          ? 'border-violet-700/70 bg-violet-950/50 text-violet-100 hover:border-violet-400 hover:bg-violet-900/60'
          : accent === 'rose'
            ? 'border-rose-700/70 bg-rose-950/50 text-rose-100 hover:border-rose-400 hover:bg-rose-900/60'
            : 'border-emerald-800/70 bg-emerald-950/40 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-900/50';
  const titleCls =
    accent === 'amber'
      ? 'text-amber-400/90'
      : accent === 'sky'
        ? 'text-sky-400/90'
        : accent === 'violet'
          ? 'text-violet-400/90'
          : accent === 'rose'
            ? 'text-rose-400/90'
            : 'text-emerald-400/90';
  const linkCls =
    accent === 'amber'
      ? 'text-amber-300'
      : accent === 'sky'
        ? 'text-sky-300'
        : accent === 'violet'
          ? 'text-violet-300'
          : accent === 'rose'
            ? 'text-rose-300'
            : 'text-emerald-400';

  return (
    <>
      <p className={`mb-2 flex items-center gap-1 text-[10px] font-medium uppercase ${titleCls}`}>
        <Bug size={11} />
        {title} · {families.length} nodos · click = catálogo
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {families.map((fam) => {
          const famPath = `${categoryPath}/${fam}`;
          const href = catalogueHref('es', {
            rubro: 'dried-specimens',
            region: regionId,
            categoria: categoryId,
            familia: slugifyCatalogue(fam),
          });
          return (
            <Link
              key={fam}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`rounded border px-2 py-1 text-[10px] transition ${chip}`}
              title={`Abrir catálogo · ${nodeCardFolder(famPath)}`}
            >
              {fam}
            </Link>
          );
        })}
      </div>
      <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
        <Link href={catalogHref} className={`hover:underline ${linkCls}`}>
          Ver familias en catálogo →
        </Link>
        <Link
          href="/admin/espejo"
          className="text-sky-400 hover:underline"
          title="Subir card/video de este grupo"
        >
          Subir media en Espejo →
        </Link>
      </div>
    </>
  );
}

const REGION_FAMILY_UI: Record<
  (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id'],
  {
    families: readonly string[];
    accent: FamilyAccent;
    title: string;
    catalogHref: string;
    badge: string;
    highlight: boolean;
  }
> = {
  neotropical: {
    families: EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
    accent: 'emerald',
    title: 'Butterflies Neotropical (17)',
    catalogHref:
      '/es/catalogue/dried-specimens/neotropical/butterflies-lepidoptera-diurne?view=families',
    badge: '· PRINCIPAL · REGION 1 · 17 fam',
    highlight: true,
  },
  afrotropical: {
    families: EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
    accent: 'amber',
    title: 'Butterflies Africa',
    catalogHref:
      '/es/catalogue/dried-specimens/afrotropical/butterflies-lepidoptera-diurne?view=families',
    badge: '· 5 fam listas',
    highlight: false,
  },
  'australasian-oriental': {
    families: EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
    accent: 'sky',
    title: 'Butterflies Australasian',
    catalogHref:
      '/es/catalogue/dried-specimens/australasian-oriental/butterflies-lepidoptera-diurne?view=families',
    badge: '· 9 taxones listos',
    highlight: false,
  },
  'holarctic-europe': {
    families: EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
    accent: 'violet',
    title: 'Butterflies Europe',
    catalogHref:
      '/es/catalogue/dried-specimens/holarctic-europe/butterflies-lepidoptera-diurne?view=families',
    badge: '· 5 fam listas',
    highlight: false,
  },
  nearctic: {
    families: EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
    accent: 'rose',
    title: 'Butterflies Nearctic',
    catalogHref:
      '/es/catalogue/dried-specimens/nearctic/butterflies-lepidoptera-diurne?view=families',
    badge: '· 5 fam listas',
    highlight: false,
  },
};

/**
 * Rubro 1 (ESPECIMENS SECOS) × 5 regiones.
 * Foco admin: Rare, Gynan, Hybrid, Freak · 4 hijos ×5 · _card/_video.
 */
export default function RubrosRegionesPanel() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Layers size={18} className="text-sky-400" />
          Prioridad · Primer rubro × todas las regiones
        </h2>
        <p className="mt-1 max-w-3xl text-xs text-neutral-500">
          Diurne · Nocturne · Beetles · Insects listos. Foco:{' '}
          <strong className="text-cyan-300">
            {CURRENT_CATEGORY_FOCUS.displayLabel}
          </strong>{' '}
          (Cloudinary:{' '}
          <code className="text-cyan-200/80">{RARE_GYNAN_CATEGORY_SEGMENT}</code>
          ) · {EXPECTED_RARE_SUBFOLDERS.length} hijos ×5 · c/u _card + _video.
          Media:{' '}
          <Link href="/admin/espejo" className="text-sky-400 hover:underline">
            Espejo C↔S
          </Link>
          .
        </p>
      </div>

      {/* Foco actual: Rare / Gynan / Hybrid / Freak */}
      <div className="rounded-xl border border-cyan-600/70 bg-cyan-950/35 p-4 ring-1 ring-cyan-700/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase text-cyan-400">
              Foco actual · avance #{CURRENT_CATEGORY_FOCUS.userSequence} ·
              array #{CURRENT_CATEGORY_FOCUS.index1Based} / 5 · rubro 1 secos
            </p>
            <p className="mt-0.5 text-base font-semibold text-white">
              {RARE_GYNAN_DISPLAY_LABEL}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Path:{' '}
              <code className="text-cyan-200/80">{RARE_GYNAN_CATEGORY_SEGMENT}</code>{' '}
              · × 5 REGIONs · {EXPECTED_RARE_SUBFOLDERS.length} hijos (categoría
              + c/u → _card/_video). Primario: Neotropical.
            </p>
            <p
              className="mt-1 break-all font-mono text-[10px] text-neutral-500"
              title={CURRENT_CATEGORY_FOCUS.nodePath}
            >
              {CURRENT_CATEGORY_FOCUS.nodePath}
            </p>
          </div>
          <div className="text-right text-[10px]">
            <p className="text-amber-300/90">_card + _video de la categoría</p>
            <p
              className="mt-1 max-w-sm truncate font-mono text-neutral-500"
              title={CURRENT_CATEGORY_FOCUS.cardFolder}
            >
              {CURRENT_CATEGORY_FOCUS.cardFolder}
            </p>
            <p
              className="max-w-sm truncate font-mono text-neutral-500"
              title={CURRENT_CATEGORY_FOCUS.videoFolder}
            >
              {CURRENT_CATEGORY_FOCUS.videoFolder}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-cyan-700/50 bg-cyan-950/30 p-3">
          <p className="text-[11px] font-medium text-cyan-200">
            {RARE_GYNAN_DISPLAY_LABEL} · {EXPECTED_RARE_SUBFOLDERS.length} hijos
            · c/u _card + _video
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">
            Butterflies(Lepidoptera) · Moths(Lepidoptera) ·
            Beetles(Coleoptera) · Insects(Arthropoda)
          </p>
          <p
            className="mt-1 break-all font-mono text-[9px] text-neutral-500"
            title={NEOTROPICAL_RARE_GYNAN_ROOT}
          >
            {NEOTROPICAL_RARE_GYNAN_ROOT}
          </p>
          <ul className="mt-2 space-y-1.5">
            {RARE_GYNAN_REGION_ROOTS.map((b, idx) => {
              const fams = rareGynanFamiliesForRegion(b.id);
              return (
                <li
                  key={b.id}
                  className="rounded border border-cyan-700/60 bg-cyan-950/40 px-2 py-1.5"
                >
                  <p className="text-[10px] text-cyan-100">
                    {idx + 1}. {b.regionFolder}
                    <span className="ml-1 text-cyan-400">
                      · {fams.length} nodos
                    </span>
                    {b.id === CURRENT_CATEGORY_FOCUS.primaryRegionId ? (
                      <span className="ml-1 text-cyan-400">· primario</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-mono text-[8px] text-amber-400/80">
                    {nodeCardFolder(b.nodePath)} + _video
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {fams.map((fam) => {
                      const href = catalogueHref('es', {
                        rubro: 'dried-specimens',
                        region: b.id,
                        categoria: 'rare-gynan-aberrations',
                        familia: slugifyCatalogue(fam),
                      });
                      return (
                        <Link
                          key={fam}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-cyan-800/70 bg-cyan-950/60 px-1.5 py-0.5 text-[9px] text-cyan-100/90 transition hover:border-cyan-400 hover:bg-cyan-900/70"
                          title={`Abrir · ${nodeCardFolder(`${b.nodePath}/${fam}`)}`}
                        >
                          {fam}
                        </Link>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            <Link
              href="/es/catalogue/dried-specimens/neotropical/rare-gynan-aberrations?view=families"
              className="text-cyan-300 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Ver hijos en catálogo →
            </Link>
            <Link href="/admin/espejo" className="text-sky-400 hover:underline">
              Subir _card / _video →
            </Link>
          </div>
        </div>
      </div>

      {/* Rubro 1 destacado */}
      <div className="rounded-xl border border-sky-700/50 bg-sky-950/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <FolderTree className="mt-0.5 shrink-0 text-sky-400" size={20} />
            <div>
              <p className="text-[10px] font-medium uppercase text-sky-400">
                Rubro 1 / 3 · 5 regiones completas
              </p>
              <p className="text-base font-semibold text-white">
                Especímenes secos biológicos
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Insectos / artrópodos secos (mariposas, escarabajos, etc.)
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-neutral-600">
                {RUBRO1.folder}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-amber-300/90">
            <p>_card + _video del rubro</p>
            <p
              className="mt-1 max-w-xs truncate font-mono text-neutral-600"
              title={nodeCardFolder(RUBRO1_PATH)}
            >
              {nodeCardFolder(RUBRO1_PATH)}
            </p>
          </div>
        </div>
      </div>

      {/* Todas las regiones del rubro 1 */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-500/90">
          <Globe2 size={12} />
          Regiones del rubro 1 · familias Butterflies confirmadas (5/5)
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-1">
          {GEOGRAPHIC_REGION_FOLDERS.map((reg, idx) => {
            const ui = REGION_FAMILY_UI[reg.id];
            const regionLabel = reg.folder.replace(/^REGION\s+/, '');
            const regionPath = `${RUBRO1_PATH}/${reg.folder}`;
            const butterfliesPath = `${regionPath}/${BUTTERFLIES_SEG}`;
            const beetlesPath = `${regionPath}/${BEETLES_SEG}`;
            const insectsPath = `${regionPath}/${INSECTS_SEG}`;
            const mothsPath = `${regionPath}/${MOTHS_SEG}`;
            const beetleFams = beetleFamiliesForRegion(reg.id);
            const insectFams = insectFamiliesForRegion(reg.id);
            const mothFams = mothFamiliesForRegion(reg.id);

            return (
              <div
                key={reg.id}
                className={`rounded-xl border p-4 ${
                  ui.highlight
                    ? 'border-emerald-600/70 bg-emerald-950/30 ring-1 ring-emerald-700/40'
                    : ui.accent === 'amber' || ui.accent === 'sky'
                      ? 'border-amber-800/40 bg-amber-950/15'
                      : ui.accent === 'violet'
                        ? 'border-violet-800/40 bg-violet-950/15'
                        : ui.accent === 'rose'
                          ? 'border-rose-800/40 bg-rose-950/15'
                          : 'border-neutral-800 bg-neutral-900/50'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      <span className="mr-2 text-neutral-500">{idx + 1}.</span>
                      {regionLabel}
                      <span
                        className={`ml-2 text-[10px] font-normal ${
                          ui.highlight
                            ? 'text-emerald-300'
                            : ui.accent === 'violet'
                              ? 'text-violet-300/80'
                              : ui.accent === 'rose'
                                ? 'text-rose-300/80'
                                : 'text-amber-300/80'
                        }`}
                      >
                        {ui.badge}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-neutral-500">
                      Rubro 1 (especímenes secos) · región geográfica
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-amber-400/90">_card + _video por región</p>
                    <p
                      className="mt-0.5 max-w-md truncate font-mono text-[8px] text-neutral-600"
                      title={nodeCardFolder(regionPath)}
                    >
                      {nodeCardFolder(regionPath)}
                    </p>
                    <p
                      className="max-w-md truncate font-mono text-[8px] text-neutral-600"
                      title={nodeVideoFolder(regionPath)}
                    >
                      {nodeVideoFolder(regionPath)}
                    </p>
                  </div>
                </div>

                <p className="mb-2 text-[10px] font-medium uppercase text-neutral-400">
                  5 categorías → cada una _card + _video
                  <span className="ml-2 text-cyan-400/90">
                    · #{CURRENT_CATEGORY_FOCUS.index1Based}{' '}
                    {CURRENT_CATEGORY_FOCUS.displayLabel} = foco
                  </span>
                </p>
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {DRIED_SPECIMEN_CATEGORY_FOLDERS.map((c, catIdx) => {
                    const catPath = `${regionPath}/${c.segment}`;
                    const isFocus = c.id === CURRENT_CATEGORY_FOCUS.id;
                    const focusFamCount = rareGynanFamiliesForRegion(reg.id).length;
                    const catHref = catalogueHref('es', {
                      rubro: 'dried-specimens',
                      region: reg.id,
                      categoria: c.id,
                    });
                    return (
                      <Link
                        key={c.id}
                        href={catHref}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-lg border p-2.5 transition hover:brightness-110 ${
                          isFocus
                            ? 'border-cyan-500/80 bg-cyan-950/40 ring-1 ring-cyan-600/50'
                            : 'border-neutral-700/80 bg-neutral-950/50 hover:border-sky-600/60'
                        }`}
                        title={`Abrir catálogo · ${c.segment}`}
                      >
                        <p
                          className={`text-[11px] font-medium ${
                            isFocus ? 'text-cyan-100' : 'text-neutral-200'
                          }`}
                        >
                          <span className="mr-1 text-neutral-500">{catIdx + 1}.</span>
                          {c.id === 'rare-gynan-aberrations'
                            ? RARE_GYNAN_DISPLAY_LABEL
                            : c.id === 'insects-arthropoda'
                              ? INSECTS_DISPLAY_LABEL
                              : c.id === 'moths-lepidoptera-nocturne'
                                ? MOTHS_DISPLAY_LABEL
                                : c.segment}
                          {isFocus ? (
                            <span className="ml-1 text-[9px] font-normal text-cyan-400">
                              · FOCO
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-[9px] text-sky-400/90">Abrir en catálogo →</p>
                        <p
                          className="mt-1 truncate font-mono text-[8px] text-neutral-600"
                          title={nodeCardFolder(catPath)}
                        >
                          {nodeCardFolder(catPath)}
                        </p>
                        {isFocus ? (
                          <p className="mt-1 text-[8px] text-cyan-300/80">
                            familias: {focusFamCount > 0 ? focusFamCount : 'pend.'}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>

                {mothFams.length > 0 ? (
                  <div className="mb-3">
                    <FamilyTaxonList
                      families={mothFams}
                      categoryPath={mothsPath}
                      accent="violet"
                      title={`${MOTHS_DISPLAY_LABEL} ${regionLabel.split(' ')[0] ?? regionLabel}`}
                      catalogHref={`/es/catalogue/dried-specimens/${reg.id}/moths-lepidoptera-nocturne?view=families`}
                      regionId={reg.id}
                      categoryId="moths-lepidoptera-nocturne"
                    />
                  </div>
                ) : null}

                {insectFams.length > 0 ? (
                  <div className="mb-3">
                    <FamilyTaxonList
                      families={insectFams}
                      categoryPath={insectsPath}
                      accent="sky"
                      title={`Insects ${regionLabel.split(' ')[0] ?? regionLabel}`}
                      catalogHref={`/es/catalogue/dried-specimens/${reg.id}/insects-arthropoda?view=families`}
                      regionId={reg.id}
                      categoryId="insects-arthropoda"
                    />
                  </div>
                ) : null}

                {beetleFams.length > 0 ? (
                  <div className="mb-3">
                    <FamilyTaxonList
                      families={beetleFams}
                      categoryPath={beetlesPath}
                      accent="sky"
                      title={`Beetles ${regionLabel.split(' ')[0] ?? regionLabel}`}
                      catalogHref={`/es/catalogue/dried-specimens/${reg.id}/beetles-coleoptera-insects?view=families`}
                      regionId={reg.id}
                      categoryId="beetles-coleoptera-insects"
                    />
                  </div>
                ) : null}

                <FamilyTaxonList
                  families={ui.families}
                  categoryPath={butterfliesPath}
                  accent={ui.accent}
                  title={ui.title}
                  catalogHref={ui.catalogHref}
                  regionId={reg.id}
                  categoryId="butterflies-lepidoptera-diurne"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Rubros 2–3 aparcados */}
      <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3">
        <p className="text-[10px] font-medium uppercase text-neutral-600">
          Después (no ahora) · Rubros 2 y 3
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-neutral-500">
          {RUBROS_CHILD_FOLDERS.slice(1).map((r, i) => (
            <li key={r.id}>
              {i + 2}.{' '}
              {r.id === 'zoology-skeletons'
                ? 'Esqueletos de zoología'
                : 'Plantas secas NO-CITES'}{' '}
              — mismas {GEOGRAPHIC_REGION_FOLDERS.length} regiones, cuando rubro 1 esté listo
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
