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
  /** nav = barra · panel = bloque · field = junto a GRABAR/campos */
  variant?: 'nav' | 'panel' | 'field';
  className?: string;
  /** Motivo enviado a la API (trazas). */
  reason?: string;
};

export default function PublishProductionButton({
  variant = 'nav',
  className = '',
  reason,
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

  const run = useCallback(
    async (mode: PublishMode) => {
      setBusy(mode);
      setMsg(null);
      const why =
        reason ??
        (mode === 'redeploy' ? 'admin-ui-redeploy' : 'admin-ui-cache');
      try {
        const result = await publishProductionToVercel(mode, why);
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
    },
    [reason],
  );

  const msgClass =
    msg &&
    (msg.toLowerCase().includes('falta') || msg.toLowerCase().includes('error')
      ? 'text-amber-400'
      : 'text-emerald-400');

  if (variant === 'field') {
    return (
      <div
        className={`rounded-xl border border-emerald-800/70 bg-emerald-950/40 p-3 ${className}`}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
          Actualización completa → Vercel
        </p>
        <div className="flex w-full flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('cache')}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white touch-manipulation hover:bg-emerald-600 disabled:opacity-50 sm:flex-none"
          >
            {busy === 'cache' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CloudUpload size={14} />
            )}
            Actualizar producción
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('redeploy')}
            title={
              hookOk
                ? 'Rebuild completo Production'
                : 'Configura VERCEL_DEPLOY_HOOK_URL'
            }
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-700 bg-violet-950/60 px-3 py-2 text-xs font-semibold text-violet-100 touch-manipulation hover:bg-violet-900/70 disabled:opacity-50 sm:flex-none"
          >
            {busy === 'redeploy' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Rocket size={14} />
            )}
            Redeploy completo
          </button>
        </div>
        {msg ? <p className={`mt-2 text-[11px] ${msgClass}`}>{msg}</p> : null}
      </div>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className={`rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 ${className}`}
      >
        <p className="mb-2 text-xs text-emerald-200/90">
          Tras subir fotos, videos o cambios: actualización completa a Vercel
          sin pedir redeploy al chat.
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
            Redeploy completo
          </button>
          {msg ? <span className={`text-xs ${msgClass}`}>{msg}</span> : null}
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
        <span className={`max-w-[14rem] text-right text-[10px] leading-tight ${msgClass}`}>
          {msg}
        </span>
      ) : null}
    </div>
  );
}
