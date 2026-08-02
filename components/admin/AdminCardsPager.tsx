'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCataloguePageList } from '@/lib/specimens/cataloguePagination';

type Props = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPage: (n: number) => void;
  onPageSize?: (n: number) => void;
  pageSizeOptions?: number[];
  label?: string;
  /** Ancla para scroll al cambiar de página (id del contenedor de fichas). */
  scrollTargetId?: string;
};

export default function AdminCardsPager({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPage,
  onPageSize,
  pageSizeOptions = [2, 4, 6, 8],
  label = 'fichas',
  scrollTargetId,
}: Props) {
  const prevPage = useRef(page);

  useEffect(() => {
    if (prevPage.current === page) return;
    prevPage.current = page;
    if (typeof window === 'undefined') return;
    const el = scrollTargetId
      ? document.getElementById(scrollTargetId)
      : null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page, scrollTargetId]);

  if (totalItems === 0) return null;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const nums = buildCataloguePageList(safePage, totalPages);

  function go(n: number) {
    const next = Math.min(totalPages, Math.max(1, n));
    if (next === safePage) return;
    onPage(next);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-3">
      <p className="text-[11px] text-neutral-500">
        {totalItems} {label} · A–Z · {pageSize}/pág · pág. {safePage}/{totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {onPageSize ? (
          <label className="mr-1 flex items-center gap-1 text-[10px] text-neutral-500">
            Por pág.
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-[11px] text-neutral-200"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => go(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-700 text-neutral-300 hover:border-emerald-500/50 disabled:opacity-30"
          aria-label="Anterior"
        >
          <ChevronLeft size={14} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e-${i}`} className="px-1 text-[11px] text-neutral-600">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => go(n)}
              aria-current={n === safePage ? 'page' : undefined}
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded border px-1.5 text-[11px] transition ${
                n === safePage
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
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
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-700 text-neutral-300 hover:border-emerald-500/50 disabled:opacity-30"
          aria-label="Siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
