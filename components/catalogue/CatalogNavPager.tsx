'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CatalogNavCard from './CatalogNavCard';
import type { CatalogueNavNode } from '@/lib/specimens/catalogueNav';
import {
  buildCataloguePageList,
  catalogueNavPerPage,
} from '@/lib/specimens/cataloguePagination';

export type CatalogNavPagerItem = {
  node: CatalogueNavNode;
  href: string;
};

type Props = {
  items: CatalogNavPagerItem[];
  showCardVideo?: boolean;
  childLabel?: string;
};

export default function CatalogNavPager({
  items,
  showCardVideo = false,
  childLabel,
}: Props) {
  const pageSize = catalogueNavPerPage();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

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

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map(({ node, href }) => (
          <CatalogNavCard
            key={node.id}
            node={node}
            href={href}
            showCardVideo={showCardVideo}
            childLabel={childLabel ?? (showCardVideo ? 'especímenes' : 'ítems')}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
          aria-label="Paginación del catálogo"
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
