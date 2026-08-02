'use client';

/**
 * Grid de especies del catálogo: 6 por página, páginas 1·2·3…∞.
 * Misma config regenerativa que el resto del storefront
 * (NEXT_PUBLIC_CATALOGUE_SPECIES_PER_PAGE, default 6).
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SpecimenCard from '@/components/SpecimenCard';
import { compareSpecimensAlphabetical } from '@/lib/specimens/catalogueNav';
import type { SpecimenView } from '@/lib/specimens/view';
import {
  buildCataloguePageList,
  catalogueSpeciesPerPage,
} from '@/lib/specimens/cataloguePagination';

type Props = {
  specimens: SpecimenView[];
  strings: Record<string, string>;
  lang: string;
  returnFamilyHref?: string;
  returnFamilyLabel?: string;
  returnCategoryHref?: string;
  returnCategoryLabel?: string;
};

export default function CatalogSpeciesPager({
  specimens,
  strings,
  lang,
  returnFamilyHref,
  returnFamilyLabel,
  returnCategoryHref,
  returnCategoryLabel,
}: Props) {
  const pageSize = catalogueSpeciesPerPage();
  const [page, setPage] = useState(1);

  // A→Z por nombre científico (el inventario llega por fecha de alta).
  const sorted = useMemo(
    () => [...specimens].sort(compareSpecimensAlphabetical),
    [specimens],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  const pageNumbers = useMemo(
    () => buildCataloguePageList(safePage, totalPages),
    [safePage, totalPages],
  );

  function go(n: number) {
    setPage(Math.min(totalPages, Math.max(1, n)));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (sorted.length === 0) return null;

  return (
    <div>
      <p className="mb-4 text-xs text-white/45">
        {sorted.length} especies · {pageSize} por página · pág. {safePage}/{totalPages} · A–Z
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((s) => (
          <SpecimenCard
            key={s.id}
            s={s}
            strings={strings}
            lang={lang}
            returnFamilyHref={returnFamilyHref}
            returnFamilyLabel={returnFamilyLabel}
            returnCategoryHref={returnCategoryHref}
            returnCategoryLabel={returnCategoryLabel}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
          aria-label="Paginación de especies"
        >
          <button
            type="button"
            onClick={() => go(safePage - 1)}
            disabled={safePage <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((n, i) =>
            n === '…' ? (
              <span key={`e-${i}`} className="px-1.5 text-sm text-neutral-600" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => go(n)}
                aria-current={n === safePage ? 'page' : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition ${
                  n === safePage
                    ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                    : 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => go(safePage + 1)}
            disabled={safePage >= totalPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
