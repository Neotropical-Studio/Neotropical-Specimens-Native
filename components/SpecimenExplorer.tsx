'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Radio, SlidersHorizontal } from 'lucide-react';
import { searchHaystack, type SpecimenView } from '@/lib/specimens/view';
import type { LiveSyncMode } from '@/lib/specimens/useLiveSpecimens';
import InventoryEmptyState from './InventoryEmptyState';
import SpecimenCard from './SpecimenCard';

const SEX_LABELS: Record<string, string> = { M: 'Macho', F: 'Hembra', P: 'Par', U: 'N/D' };

interface Props {
  initial: SpecimenView[];
  strings: Record<string, string>;
  lang: string;
  syncMode?: LiveSyncMode;
  liveOwned?: boolean;
}

export default function SpecimenExplorer({
  initial,
  strings,
  lang,
  syncMode = 'off',
  liveOwned = false,
}: Props) {
  const specimens = initial;
  const [query, setQuery]           = useState('');
  const [family, setFamily]         = useState<string | null>(null);
  const [country, setCountry]       = useState<string | null>(null);
  const [sex, setSex]               = useState<string | null>(null);
  const [grade, setGrade]           = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showMore, setShowMore]     = useState(false);
  const mode = liveOwned ? syncMode : 'off';

  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  // ── Compute unique filter options from the live inventory ────────────────
  const families = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of specimens) if (s.family) counts.set(s.family, (counts.get(s.family) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f]) => f);
  }, [specimens]);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of specimens) {
      const c = s.regionName ?? s.country;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  }, [specimens]);

  const sexOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const s of specimens) if (s.sex && s.sex !== 'U') seen.add(s.sex);
    return ['M', 'F', 'P'].filter((sx) => seen.has(sx));
  }, [specimens]);

  const gradeOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const s of specimens) if (s.grade) seen.add(s.grade);
    // Show only the most common grades to keep the bar clean
    const order = ['A.1', 'A1-', 'A2', 'B3', 'VGA', 'UNRATED'];
    return order.filter((g) => seen.has(g));
  }, [specimens]);

  const hasSecondRow = countries.length > 0 || sexOptions.length > 0 || gradeOptions.length > 0;
  const activeFilters = [country, sex, grade, inStockOnly || null].filter(Boolean).length;
  const hasActiveFilters = !!family || !!country || !!sex || !!grade || inStockOnly;

  // ── Filtered results ──────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specimens.filter((s) => {
      if (family     && s.family !== family)                 return false;
      if (country    && (s.regionName ?? s.country) !== country) return false;
      if (sex        && s.sex !== sex)                       return false;
      if (grade      && s.grade !== grade)                   return false;
      if (inStockOnly && s.stock === 0)                      return false;
      if (q          && !searchHaystack(s).includes(q))      return false;
      return true;
    });
  }, [specimens, query, family, country, sex, grade, inStockOnly]);

  const inventoryEmpty = specimens.length === 0;

  function clearAll() {
    setFamily(null); setCountry(null); setSex(null);
    setGrade(null); setInStockOnly(false); setQuery('');
  }

  return (
    <section id="catalogo" className="mx-auto max-w-7xl px-4 pb-24">
      {/* ── Filter bar (sticky) ─────────────────────────────────────────── */}
      <div className="sticky top-[104px] z-30 -mx-4 mb-6 border-y border-white/10 bg-neutral-950/90 px-4 py-4 backdrop-blur-lg">
        {/* Row 1: Search input */}
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', 'Busca por especie, familia, país, calidad…')}
            disabled={inventoryEmpty}
            className="w-full rounded-xl border border-white/10 bg-neutral-900/70 py-3 pl-11 pr-11 text-white placeholder:text-neutral-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('search.clear', 'Limpiar búsqueda')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Row 2: Family chips */}
        {families.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500 w-14 shrink-0">Familia</span>
            <Chip active={family === null} onClick={() => setFamily(null)}>
              {t('filter.all', 'Todas')}
            </Chip>
            {families.map((f) => (
              <Chip key={f} active={family === f} onClick={() => setFamily(family === f ? null : f)}>
                {f}
              </Chip>
            ))}
          </div>
        )}

        {/* Row 3+: Secondary filters (toggle) */}
        {hasSecondRow && (
          <button
            onClick={() => setShowMore((v) => !v)}
            className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <SlidersHorizontal size={13} />
            {showMore ? 'Ocultar filtros' : 'Más filtros'}
            {activeFilters > 0 && !showMore && (
              <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black leading-none">
                {activeFilters}
              </span>
            )}
          </button>
        )}

        {showMore && (
          <div className="mt-3 space-y-2.5">
            {countries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500 w-14 shrink-0">País</span>
                <Chip active={country === null} onClick={() => setCountry(null)}>Todos</Chip>
                {countries.map((c) => (
                  <Chip key={c} active={country === c} onClick={() => setCountry(country === c ? null : c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            )}

            {sexOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500 w-14 shrink-0">Sexo</span>
                <Chip active={sex === null} onClick={() => setSex(null)}>Todos</Chip>
                {sexOptions.map((sx) => (
                  <Chip key={sx} active={sex === sx} onClick={() => setSex(sex === sx ? null : sx)}>
                    {SEX_LABELS[sx] ?? sx}
                  </Chip>
                ))}
              </div>
            )}

            {gradeOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500 w-14 shrink-0">Calidad</span>
                <Chip active={grade === null} onClick={() => setGrade(null)}>Todas</Chip>
                {gradeOptions.map((g) => (
                  <Chip key={g} active={grade === g} onClick={() => setGrade(grade === g ? null : g)}>
                    {g}
                  </Chip>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-500 w-14 shrink-0">Stock</span>
              <Chip active={inStockOnly} onClick={() => setInStockOnly((v) => !v)}>
                Solo disponibles
              </Chip>
            </div>
          </div>
        )}

        {/* Status bar + clear all */}
        <div className="mt-3 flex items-center justify-between gap-3">
          {hasActiveFilters ? (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition"
            >
              <X size={12} /> Limpiar filtros
            </button>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-3 text-xs text-neutral-500">
            {mode === 'ws' && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Radio size={12} className="animate-pulse" /> {t('status.live', 'en vivo')}
              </span>
            )}
            {mode === 'poll' && (
              <span className="inline-flex items-center gap-1 text-amber-400"
                title={t('status.polling_hint', 'Tiempo real no disponible en tu red; se refresca cada minuto.')}>
                <Radio size={12} /> {t('status.polling', 'sincronizando')}
              </span>
            )}
            <span>
              {t('search.count', '{shown} de {total}')
                .replace('{shown}', results.length.toLocaleString(lang))
                .replace('{total}', specimens.length.toLocaleString(lang))}
            </span>
          </span>
        </div>
      </div>

      {/* ── Specimen grid ──────────────────────────────────────────────────── */}
      {results.length > 0 ? (
        <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {results.map((s) => (
              <SpecimenCard key={s.id} s={s} strings={strings} lang={lang} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : inventoryEmpty ? (
        <InventoryEmptyState
          variant="catalog"
          title={t('catalog.empty_title', 'Catálogo listo para recepción de inventario')}
          subtitle={t(
            'catalog.empty_subtitle',
            'Expedición en curso: sincronizando nuevos especímenes de los 3 rubros. Las fichas aparecerán solas al subir productos reales con fotos Cloudinary y taxonomía Supabase.',
          )}
          showRubros
        />
      ) : (
        <InventoryEmptyState
          variant="inline"
          title={t('catalog.no_results_title', 'Sin coincidencias')}
          subtitle={t('catalog.no_results', 'Ningún espécimen coincide con tu búsqueda.')}
          showRubros={false}
        />
      )}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
          : 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
