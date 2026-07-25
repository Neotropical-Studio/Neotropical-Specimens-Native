'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Radio } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import {
  SPECIMEN_SELECT,
  searchHaystack,
  toSpecimenView,
  type SpecimenRow,
  type SpecimenView,
} from '@/lib/specimens/view';
import SpecimenCard from './SpecimenCard';

// Margen de gracia para el WebSocket antes de caer a sondeo, y cadencia del
// sondeo. Un minuto mantiene el inventario fresco sin castigar la cuota de API.
const WS_GRACE_MS = 8_000;
const POLL_MS = 60_000;

interface Props {
  initial: SpecimenView[];
  strings: Record<string, string>;
  lang: string;
}

export default function SpecimenExplorer({ initial, strings, lang }: Props) {
  const [specimens, setSpecimens] = useState<SpecimenView[]>(initial);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string | null>(null);
  // 'ws' tiempo real · 'poll' sondeo (WebSocket bloqueado) · 'off' sin backend
  const [mode, setMode] = useState<'ws' | 'poll' | 'off'>('off');

  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  // Sincronización en vivo con failover: WebSocket si el entorno lo permite y
  // sondeo periódico si no. Tras cortafuegos estrictos (o proxies corporativos)
  // el WebSocket de Supabase no se establece; sin plan B la portada se quedaba
  // congelada con los datos del servidor y sin ningún aviso.
  useEffect(() => {
    let active = true;
    let cleanup = () => {};

    try {
      const supabase = getSupabaseBrowser();

      const refresh = async () => {
        const { data } = await supabase
          .from('specimens')
          .select(SPECIMEN_SELECT)
          .order('created_at', { ascending: false });
        if (active && data) setSpecimens((data as SpecimenRow[]).map(toSpecimenView));
      };

      let subscribed = false;
      let poll: ReturnType<typeof setInterval> | null = null;
      const startPolling = () => {
        if (poll || !active) return;
        poll = setInterval(refresh, POLL_MS);
        setMode('poll');
      };
      const stopPolling = () => {
        if (poll) clearInterval(poll);
        poll = null;
      };

      const channel = supabase
        .channel('specimens-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'specimens' }, refresh)
        .subscribe((status) => {
          if (!active) return;
          if (status === 'SUBSCRIBED') {
            subscribed = true;
            stopPolling();          // el WS manda: es más fresco y más barato
            setMode('ws');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            subscribed = false;
            startPolling();
          }
        });

      // Red de seguridad: si el WS no confirma en el margen de gracia (típico
      // cuando el handshake se descarta en silencio, sin error), se pasa a sondeo.
      const grace = setTimeout(() => {
        if (active && !subscribed) startPolling();
      }, WS_GRACE_MS);

      cleanup = () => {
        clearTimeout(grace);
        stopPolling();
        supabase.removeChannel(channel);
      };
    } catch {
      // Supabase no configurado: la portada permanece con los datos del servidor.
      setMode('off');
    }

    return () => {
      active = false;
      cleanup();
    };
  }, []);

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

  return (
    <section id="catalogo" className="mx-auto max-w-7xl px-4 pb-24">
      {/* Buscador rápido */}
      <div className="sticky top-[68px] z-30 -mx-4 mb-6 border-y border-white/10 bg-neutral-950/80 px-4 py-4 backdrop-blur-lg">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', 'Busca por especie, familia, país, color…')}
            className="w-full rounded-xl border border-white/10 bg-neutral-900/70 py-3 pl-11 pr-11 text-white placeholder:text-neutral-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
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

        {/* Chips de familia */}
        {families.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip active={family === null} onClick={() => setFamily(null)}>
              {t('filter.all', 'Todas')}
            </Chip>
            {families.map((f) => (
              <Chip key={f} active={family === f} onClick={() => setFamily(family === f ? null : f)}>
                {f}
              </Chip>
            ))}
            <span className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
              {mode === 'ws' && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Radio size={12} className="animate-pulse" /> {t('status.live', 'en vivo')}
                </span>
              )}
              {/* Degradado honesto: se avisa de que la frescura es por sondeo. */}
              {mode === 'poll' && (
                <span
                  className="inline-flex items-center gap-1 text-amber-400"
                  title={t('status.polling_hint', 'Tiempo real no disponible en tu red; se refresca cada minuto.')}
                >
                  <Radio size={12} /> {t('status.polling', 'sincronizando')}
                </span>
              )}
              {/* Recuento con formato numérico del locale activo */}
              <span>
                {t('search.count', '{shown} de {total}')
                  .replace('{shown}', results.length.toLocaleString(lang))
                  .replace('{total}', specimens.length.toLocaleString(lang))}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      {results.length > 0 ? (
        <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {results.map((s) => (
              <SpecimenCard key={s.id} s={s} strings={strings} lang={lang} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="py-24 text-center font-mono text-neutral-500">
          {specimens.length === 0
            ? t('catalog.empty', 'Aún no hay especímenes sincronizados.')
            : t('catalog.no_results', 'Ningún espécimen coincide con tu búsqueda.')}
        </div>
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
