'use client';

// Primera puerta del catálogo en la parte de abajo de la portada:
// las 5 categorías canónicas. Al elegir una → familias (flujo normal).
import { useMemo } from 'react';
import CatalogNavCard from '@/components/catalogue/CatalogNavCard';
import {
  buildCategoryNodes,
  categoryEntryHref,
  DEFAULT_CATALOGUE_REGION_ID,
} from '@/lib/specimens/catalogueNav';
import type { SpecimenView } from '@/lib/specimens/view';

interface Props {
  /** Inventario vivo (conteos). */
  specimens: SpecimenView[];
  /** SSR con `_card`/`_video` de nodo — se fusiona para no perder covers al sync. */
  mediaSeed?: SpecimenView[];
  lang: string;
  title?: string;
  subtitle?: string;
  childLabel?: string;
}

const RUBRO_ID = 'dried-specimens' as const;

function mergeForCategoryNodes(
  live: SpecimenView[],
  seed: SpecimenView[] | undefined,
): SpecimenView[] {
  if (!seed?.length) return live;
  const nodeMedia = seed.filter((s) => s.id.startsWith('node-media:'));
  if (nodeMedia.length === 0) return live;
  const withoutDup = live.filter((s) => !s.id.startsWith('node-media:'));
  return [...withoutDup, ...nodeMedia];
}

export default function HomeCategoryWindows({
  specimens,
  mediaSeed,
  lang,
  title = 'Categorías',
  subtitle = 'Elige una categoría. Después verás las familias como siempre.',
  childLabel = 'especímenes',
}: Props) {
  const nodes = useMemo(
    () =>
      buildCategoryNodes(
        mergeForCategoryNodes(specimens, mediaSeed),
        RUBRO_ID,
        DEFAULT_CATALOGUE_REGION_ID,
      ),
    [specimens, mediaSeed],
  );

  return (
    <section
      id="catalogo"
      className="relative border-t border-white/10 bg-black/20"
    >
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 md:pb-28 md:pt-16">
        <header className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">
            Catálogo
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">{subtitle}</p>
        </header>

        {nodes.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-neutral-900/40 px-4 py-8 text-center text-sm text-white/45">
            No hay categorías disponibles todavía.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {nodes.map((node) => (
              <CatalogNavCard
                key={node.id}
                node={node}
                href={categoryEntryHref(
                  lang,
                  {
                    rubro: RUBRO_ID,
                    region: DEFAULT_CATALOGUE_REGION_ID,
                    categoria: node.id,
                  },
                  Boolean(node.videoPublicId?.trim()),
                )}
                showCardVideo
                childLabel={childLabel}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
