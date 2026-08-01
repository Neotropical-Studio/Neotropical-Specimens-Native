'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';

type ModuleDef = {
  id: string;
  label: string;
  href: string;
  /** stub = UI existe pero schema incompleto (campañas/embarques) */
  expected: 'active' | 'stub' | 'external';
};

const MODULES: ModuleDef[] = [
  { id: 'panel', label: 'Panel', href: '/admin', expected: 'active' },
  { id: 'espejo', label: 'Espejo C↔S (cards/videos)', href: '/admin/espejo', expected: 'active' },
  { id: 'consola', label: 'Consola Maestra', href: '/admin/consola', expected: 'active' },
  { id: 'especimenes', label: 'Taxonomía y Datos', href: '/admin/especimenes', expected: 'active' },
  { id: 'multimedia', label: 'Multimedia y 3D', href: '/admin/multimedia', expected: 'active' },
  { id: 'ingesta', label: 'Ingesta de Activos', href: '/admin/ingesta', expected: 'active' },
  { id: 'campanas', label: 'Campañas', href: '/admin/campanas', expected: 'stub' },
  { id: 'embarques', label: 'Documentos y Logística', href: '/admin/embarques', expected: 'stub' },
  {
    id: 'cat-hub',
    label: 'Catálogo público (hub)',
    href: '/es/catalogue',
    expected: 'external',
  },
  {
    id: 'cat-neo',
    label: 'Catálogo · Neotropical',
    href: '/es/catalogue/dried-specimens/neotropical',
    expected: 'external',
  },
];

type ProbeResult = {
  ok: boolean;
  status: number;
  ms: number;
  error?: string;
};

export default function AdminModulesProbe() {
  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [running, setRunning] = useState(false);

  const runProbe = useCallback(async () => {
    setRunning(true);
    const next: Record<string, ProbeResult> = {};
    for (const m of MODULES) {
      const t0 = performance.now();
      try {
        const res = await fetch(m.href, {
          method: 'GET',
          credentials: 'same-origin',
          redirect: 'follow',
          cache: 'no-store',
        });
        const ms = Math.round(performance.now() - t0);
        // 200–399 = página responde (login redirect 307/302 también cuenta como “vive”)
        const ok = res.status > 0 && res.status < 500;
        next[m.id] = { ok, status: res.status, ms };
      } catch (e) {
        next[m.id] = {
          ok: false,
          status: 0,
          ms: Math.round(performance.now() - t0),
          error: e instanceof Error ? e.message : String(e),
        };
      }
      setResults({ ...next });
    }
    setRunning(false);
  }, []);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  const activeOk = MODULES.filter((m) => results[m.id]?.ok).length;
  const total = MODULES.length;

  return (
    <section className="rounded-xl border border-sky-900/50 bg-sky-950/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-sky-200">
            Comprobación universal · módulos admin + catálogo
          </h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Prueba en vivo qué abre y qué falla. Verde = responde · Rojo = error 5xx / red · Ámbar =
            stub (abre pero schema incompleto).
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void runProbe()}
          className="inline-flex items-center gap-2 rounded border border-sky-700 bg-sky-950 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-900 disabled:opacity-50"
        >
          <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
          {running ? 'Probando…' : 'Probar todo de nuevo'}
        </button>
      </div>

      <p className="mb-3 text-xs text-neutral-400">
        Resultado: <strong className="text-white">{activeOk}/{total}</strong> responden
      </p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {MODULES.map((m) => {
          const r = results[m.id];
          const pending = !r && running;
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={m.href}
                  className="truncate text-sm text-neutral-200 hover:text-sky-300 hover:underline"
                  target={m.expected === 'external' ? '_blank' : undefined}
                  rel={m.expected === 'external' ? 'noreferrer' : undefined}
                >
                  {m.label}
                </Link>
                <p className="font-mono text-[10px] text-neutral-600">{m.href}</p>
              </div>
              <div className="shrink-0 text-right">
                {pending ? (
                  <span className="text-[10px] text-neutral-500">…</span>
                ) : !r ? (
                  <span className="text-[10px] text-neutral-600">—</span>
                ) : r.ok ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 size={14} />
                    {m.expected === 'stub' ? (
                      <span className="text-amber-300">STUB {r.status}</span>
                    ) : (
                      <span>OK {r.status}</span>
                    )}
                    <span className="text-neutral-600">{r.ms}ms</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
                    <XCircle size={14} />
                    FAIL {r.status || ''}
                  </span>
                )}
                {m.expected === 'stub' && r?.ok ? (
                  <p className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] text-amber-400/90">
                    <AlertTriangle size={10} /> schema incompleto
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
