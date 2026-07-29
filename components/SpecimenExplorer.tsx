'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Radio } from 'lucide-react';
import { searchHaystack, type SpecimenView } from '@/lib/specimens/view';
import type { LiveSyncMode } from '@/lib/specimens/useLiveSpecimens';
import InventoryEmptyState from './InventoryEmptyState';
import SpecimenCard from './SpecimenCard';

interface Props {
  /** Inventario actual (ya sincronizado en vivo por LiveShowcase, o estático). */
  initial: SpecimenView[];
  strings: Record<string, string>;
  lang: string;
  /** Modo de sync reportado por el padre (ws/poll/off). */
  syncMode?: LiveSyncMode;
  /**
   * Si true, este componente NO abre su propio canal: el padre
   * (LiveShowcase) es dueño del stream y `initial` ya es el estado vivo.
   */
  liveOwned?: boolean;
}

export default function SpecimenExplorer({
  initial,
  strings,
  lang,
  syncMode = 'off',
  liveOwned = false,
}: Props) {
  // Cuando liveOwned, `initial` es el stream vivo; no se duplica estado local
  // de sync. El useState + key implícito vía prop es suficiente.
  const specimens = initial;
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string | null>(null);
  const mode = liveOwned ? syncMode : 'off';

  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  const families = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of specimens) if (s.family) counts.set(s.family, (counts.get(s.family) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f]) => f);
  }, [specimens]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specimens.filter((s) => {
      if (family && s.family !== family) return false;
      if (q && !searchHaystack(s).includes(q)) return false;
      return true;
    });
  }, [specimens, query, family]);

  const inventoryEmpty = specimens.length === 0;

  return (
    <section id="catalogo" className="mx-auto max-w-7xl px-4 pb-24">
      {/* Buscador rápido — siempre presente, listo para filtrar inventario real */}
      <div className="sticky top-[104px] z-30 -mx-4 mb-6 border-y border-white/10 bg-neutral-950/80 px-4 py-4 backdrop-blur-lg">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', 'Busca por especie, familia, país, color…')}
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {families.length > 0 && (
            <>
              <Chip active={family === null} onClick={() => setFamily(null)}>
                {t('filter.all', 'Todas')}
              </Chip>
              {families.map((f) => (
                <Chip key={f} active={family === f} onClick={() => setFamily(family === f ? null : f)}>
                  {f}
                </Chip>
              ))}
            </>
          )}
          <span className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
            {mode === 'ws' && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Radio size={12} className="animate-pulse" /> {t('status.live', 'en vivo')}
              </span>
            )}
            {mode === 'poll' && (
              <span
                className="inline-flex items-center gap-1 text-amber-400"
                title={t('status.polling_hint', 'Tiempo real no disponible en tu red; se refresca cada minuto.')}
              >
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
            'Expedición en curso: sincronizando nuevos especímenes de los 4 rubros. Las fichas aparecerán solas al subir productos reales con fotos Cloudinary y taxonomía Supabase.',
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
