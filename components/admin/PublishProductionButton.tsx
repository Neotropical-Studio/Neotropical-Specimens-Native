'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, Loader2, RefreshCw, Rocket } from 'lucide-react';

export type PublishMode = 'cache' | 'redeploy';

export type PublishClientResult = {
  ok: boolean;
  mode: PublishMode;
  cache?: boolean;
  redeploy?: {
    attempted: boolean;
    ok: boolean;
    skipped: boolean;
    status?: number;
    error?: string;
  };
  at?: string;
  error?: string;
};

/** Llama a la API de publicación (cache o redeploy Vercel). */
export async function publishProductionToVercel(
  mode: PublishMode = 'cache',
  reason = 'ui',
): Promise<PublishClientResult> {
  const res = await fetch('/api/admin/publish-production', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, reason }),
  });
  const json = (await res.json().catch(() => ({}))) as PublishClientResult & {
    error?: string;
  };
  if (!res.ok) {
    return {
      ...json,
      ok: false,
      mode,
      error: json.error ?? `HTTP ${res.status}`,
    };
  }
  return json;
}

type Props = {
  /** compact = solo iconos en la barra nav */
  variant?: 'nav' | 'panel';
  className?: string;
};

export default function PublishProductionButton({
  variant = 'nav',
  className = '',
}: Props) {
  const [busy, setBusy] = useState<PublishMode | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [hookOk, setHookOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/publish-production');
        const json = (await res.json()) as { deployHookConfigured?: boolean };
        if (!cancelled) setHookOk(Boolean(json.deployHookConfigured));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async (mode: PublishMode) => {
    setBusy(mode);
    setMsg(null);
    try {
      const result = await publishProductionToVercel(
        mode,
        mode === 'redeploy' ? 'admin-nav-redeploy' : 'admin-nav-cache',
      );
      if (mode === 'cache') {
        setMsg(
          result.ok
            ? 'Producción actualizada (caché)'
            : result.error ?? 'Error al actualizar',
        );
      } else if (result.ok) {
        setMsg('Redeploy Vercel lanzado');
      } else if (result.redeploy?.skipped) {
        setMsg('Falta VERCEL_DEPLOY_HOOK_URL en Vercel');
      } else {
        setMsg(result.error ?? 'Error en redeploy');
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      window.setTimeout(() => setMsg(null), 6000);
    }
  }, []);

  if (variant === 'panel') {
    return (
      <div
        className={`rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 ${className}`}
      >
        <p className="mb-2 text-xs text-emerald-200/90">
          Tras subir fotos, videos o cambios: actualiza la tienda en Vercel sin
          pedir redeploy al chat.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('cache')}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {busy === 'cache' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Actualizar producción
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('redeploy')}
            title={
              hookOk
                ? 'Dispara un rebuild completo en Vercel Production'
                : 'Configura VERCEL_DEPLOY_HOOK_URL en Vercel'
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-50"
          >
            {busy === 'redeploy' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Rocket size={14} />
            )}
            Redeploy Vercel
          </button>
          {msg ? (
            <span
              className={`text-xs ${
                msg.toLowerCase().includes('falta') ||
                msg.toLowerCase().includes('error')
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {msg}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('cache')}
          title="Actualizar tienda en producción (fotos, videos, catálogo)"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-2.5 py-1.5 text-xs font-medium text-emerald-50 transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === 'cache' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <CloudUpload size={13} />
          )}
          <span className="hidden sm:inline">Actualizar prod.</span>
          <span className="sm:hidden">Prod</span>
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('redeploy')}
          title={
            hookOk
              ? 'Redeploy completo en Vercel Production'
              : 'Necesita VERCEL_DEPLOY_HOOK_URL'
          }
          className="inline-flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 transition hover:border-emerald-700 hover:text-emerald-300 disabled:opacity-50"
        >
          {busy === 'redeploy' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Rocket size={13} />
          )}
          <span className="hidden md:inline">Redeploy</span>
        </button>
      </div>
      {msg ? (
        <span
          className={`max-w-[14rem] text-right text-[10px] leading-tight ${
            msg.toLowerCase().includes('falta') ||
            msg.toLowerCase().includes('error')
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        >
          {msg}
        </span>
      ) : null}
    </div>
  );
}
