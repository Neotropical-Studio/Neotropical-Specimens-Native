'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Cloud,
  Database,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPinOff,
} from 'lucide-react';

export type MirrorSummary = {
  ok?: boolean;
  mode: string;
  cloudScanned: number;
  dbScanned: number;
  upsertedMedia: number;
  createdCloud: number;
  placeholders: number;
  orphansCloud: number;
  orphansDb: number;
  specimensTouched: number;
  cleanedDeadRefs?: number;
  removedNonCatalogue?: number;
  misplacedCloud?: number;
  deadRefSamples?: string[];
  misplacedSamples?: string[];
  errors: { context: string; message: string }[];
  schemaGaps?: {
    table: string;
    missing: string[];
    note: string;
  }[];
  syncedAt?: string;
};

type Props = {
  /** Si true, carga discover al montar */
  autoDiscover?: boolean;
  className?: string;
};

export default function MirrorVisionPanel({ autoDiscover = true, className = '' }: Props) {
  const [busy, setBusy] = useState<'discover' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mirror, setMirror] = useState<MirrorSummary | null>(null);

  const run = useCallback(async (mode: 'discover' | 'apply') => {
    setBusy(mode);
    setError(null);
    try {
      const res = await fetch('/api/admin/mirror-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const json = (await res.json()) as MirrorSummary & { error?: string };
      if (!res.ok && res.status !== 207) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setMirror(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    if (autoDiscover) void run('discover');
  }, [autoDiscover, run]);

  const gaps = mirror?.schemaGaps ?? [];
  const misplaced = mirror?.misplacedSamples ?? [];
  const misplacedCount = mirror?.misplacedCloud ?? misplaced.length;
  const paired =
    mirror &&
    mirror.orphansCloud === 0 &&
    mirror.orphansDb === 0 &&
    misplacedCount === 0 &&
    (mirror.cloudScanned > 0 || mirror.dbScanned > 0);

  return (
    <section
      className={`border border-emerald-900/80 bg-zinc-950/80 p-5 font-mono text-emerald-400 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
            <Layers size={16} className="text-sky-400" />
            Visión espejo Cloudinary ↔ Supabase
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
            Catálogo solo bajo RUBROS/…/REGION…. Apply limpia refs muertas en Supabase; NUNCA crea
            _PENDING, raíz, CATALOGUE_* ni especimenes-secos. Assets fuera de sitio → listar abajo
            (limpieza manual).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run('discover')}
            disabled={busy !== null}
            className="flex items-center gap-2 border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-xs font-bold uppercase text-emerald-300 transition hover:bg-emerald-900 disabled:opacity-50"
          >
            <Search size={14} className={busy === 'discover' ? 'animate-pulse' : ''} />
            {busy === 'discover' ? 'Escaneando…' : 'Discover'}
          </button>
          <button
            type="button"
            onClick={() => void run('apply')}
            disabled={busy !== null}
            className="flex items-center gap-2 border border-sky-600 bg-sky-950/60 px-4 py-2 text-xs font-bold uppercase text-sky-300 transition hover:bg-sky-900 disabled:opacity-50"
          >
            <Cloud size={14} className={busy === 'apply' ? 'animate-pulse' : ''} />
            {busy === 'apply' ? 'Aplicando…' : 'Apply espejo'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-red-800 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {!mirror && busy && (
        <div className="flex items-center gap-2 py-8 text-xs text-emerald-700">
          <RefreshCw size={14} className="animate-spin" /> Escaneando inventario…
        </div>
      )}

      {mirror && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <Stat
              icon={<Cloud size={14} />}
              label="Cloudinary"
              value={mirror.cloudScanned}
              hint="bajo REGION…"
            />
            <Stat
              icon={<Database size={14} />}
              label="Supabase media"
              value={mirror.dbScanned}
              hint="filas al escanear"
            />
            <Stat label="Huérfanos Cloud" value={mirror.orphansCloud} tone="warn" />
            <Stat label="Huérfanos DB" value={mirror.orphansDb} tone="warn" />
            <Stat
              icon={<MapPinOff size={14} />}
              label="Fuera de lugar"
              value={misplacedCount}
              tone="warn"
              hint="no canónicos"
            />
            <Stat label="Muertos limpios" value={mirror.cleanedDeadRefs ?? 0} tone="ok" />
            <Stat label="No-catálogo quitados" value={mirror.removedNonCatalogue ?? 0} />
            <Stat label="Placeholders creados" value={mirror.placeholders} hint="debe ser 0" />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px]">
            {paired ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} /> Inventario emparejado (sin huérfanos ni fuera de sitio)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle size={14} /> Desalineación o assets fuera de sitio — Cloud manda
              </span>
            )}
            <span className="text-zinc-500">
              modo {mirror.mode}
              {mirror.syncedAt ? ` · ${new Date(mirror.syncedAt).toLocaleString('es-PE')}` : ''}
              {typeof mirror.upsertedMedia === 'number'
                ? ` · upserts ${mirror.upsertedMedia}`
                : ''}
              {typeof mirror.specimensTouched === 'number'
                ? ` · especímenes ${mirror.specimensTouched}`
                : ''}
              {` · cloud creados ${mirror.createdCloud}`}
            </span>
          </div>

          {misplacedCount > 0 && (
            <div className="mb-4 border border-amber-900/80 bg-amber-950/25 p-3 text-[11px]">
              <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wide text-amber-300">
                <MapPinOff size={14} />
                Fuera de lugar ({misplacedCount}) — limpieza manual en Media Library
              </p>
              <p className="mb-2 text-amber-700/90">
                public_ids que NO están bajo{' '}
                <code className="text-amber-200/80">
                  RUBROS/…/REGION Central  South America Neotropical/
                </code>
                . El espejo no los borra ni crea carpetas para moverlos.
              </p>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto text-amber-100/80">
                {(misplaced.length > 0 ? misplaced : ['(sin muestra — re-Discover)']).map((s) => (
                  <li key={s} className="truncate font-mono" title={s}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(mirror.deadRefSamples?.length ?? 0) > 0 && (
            <div className="mb-4 border border-zinc-800 bg-zinc-900/40 p-3 text-[11px]">
              <p className="mb-1 font-bold uppercase text-zinc-400">
                Muestra refs limpiadas / no-catálogo
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-zinc-500">
                {mirror.deadRefSamples!.map((s) => (
                  <li key={s} className="truncate font-mono">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="mb-4 border border-amber-900/70 bg-amber-950/20 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-400">
                Schema incompleto en live ({gaps.length}) — pegar SQL en Supabase SQL Editor
              </p>
              <ul className="space-y-2 text-[11px] text-amber-100/90">
                {gaps.map((g) => (
                  <li key={g.table} className="border-b border-amber-950/50 pb-2 last:border-0">
                    <span className="font-bold text-amber-300">{g.table}</span>
                    <span className="text-amber-700"> · falta </span>
                    <span className="text-amber-200">{g.missing.join(', ')}</span>
                    <div className="mt-0.5 text-amber-700">{g.note}</div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-zinc-500">
                Archivos: <code className="text-zinc-400">supabase/sql/espejo_universal_industrial.sql</code>{' '}
                → <code className="text-zinc-400">supabase/sql/delta_align_admin_stubs.sql</code>
              </p>
            </div>
          )}

          {mirror.errors?.length > 0 && (
            <details className="border border-zinc-800 bg-zinc-900/40 p-3 text-[11px]">
              <summary className="cursor-pointer font-bold text-amber-400">
                {mirror.errors.length} aviso(s) del último pase
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-zinc-400">
                {mirror.errors.slice(0, 40).map((e, i) => (
                  <li key={`${e.context}-${i}`}>
                    <span className="text-zinc-300">{e.context}</span>: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  icon?: ReactNode;
  tone?: 'ok' | 'warn';
}) {
  const color =
    tone === 'warn'
      ? value > 0
        ? 'text-amber-300 border-amber-900'
        : 'text-emerald-400 border-zinc-800'
      : tone === 'ok'
        ? 'text-sky-300 border-sky-900'
        : 'text-emerald-300 border-zinc-800';
  return (
    <div className={`border bg-zinc-900/50 px-3 py-2 ${color}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-white">{value}</div>
      {hint && <div className="text-[10px] text-zinc-600">{hint}</div>}
    </div>
  );
}
