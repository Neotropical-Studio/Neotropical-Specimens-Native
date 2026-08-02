/**
 * Publicar cambios del admin a producción (Vercel).
 *
 * - mode=cache (default): revalida tags/paths → la tienda ve fotos/videos/cambios ya.
 * - mode=redeploy: además dispara Deploy Hook de Vercel (rebuild completo).
 *
 * El Deploy Hook es opcional (VERCEL_DEPLOY_HOOK_URL). Sin él, el botón de
 * cache sigue funcionando en el deployment donde corre el admin.
 */
import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateNodeMediaInventory } from '@/lib/services/node-media-inventory';

export type PublishMode = 'cache' | 'redeploy';

export type PublishProductionResult = {
  ok: boolean;
  mode: PublishMode;
  cache: boolean;
  redeploy: {
    attempted: boolean;
    ok: boolean;
    skipped: boolean;
    status?: number;
    error?: string;
  };
  at: string;
  reason?: string;
  error?: string;
};

const FALLBACK_LOCALES = ['es', 'en', 'pt', 'zh-CN', 'zh-HK', 'zh-MO', 'zh-TW', 'ko', 'ja'];

function storefrontLocales(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_FALLBACK_LOCALES ??
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE ??
    'es,en';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : FALLBACK_LOCALES;
}

function revalidateStorefront(): void {
  invalidateNodeMediaInventory();
  try {
    revalidateTag('neo-node-media');
  } catch {
    /* fuera de request Next */
  }

  try {
    revalidatePath('/', 'layout');
  } catch {
    /* ignore */
  }

  for (const lang of storefrontLocales()) {
    try {
      revalidatePath(`/${lang}`, 'layout');
      revalidatePath(`/${lang}/catalogue`, 'layout');
      revalidatePath(`/${lang}/product`, 'layout');
    } catch {
      /* ignore */
    }
  }

  try {
    revalidatePath('/admin', 'layout');
  } catch {
    /* ignore */
  }
}

async function triggerDeployHook(): Promise<PublishProductionResult['redeploy']> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  if (!hook) {
    return {
      attempted: false,
      ok: false,
      skipped: true,
      error: 'Falta VERCEL_DEPLOY_HOOK_URL en variables de Vercel',
    };
  }

  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        attempted: true,
        ok: false,
        skipped: false,
        status: res.status,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
    return { attempted: true, ok: true, skipped: false, status: res.status };
  } catch (e) {
    return {
      attempted: true,
      ok: false,
      skipped: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Publica a producción. Seguro llamar tras cada upload/modificación.
 * Nunca lanza: falla de redeploy no tumba el upload.
 */
export async function publishProduction(opts?: {
  mode?: PublishMode;
  reason?: string;
}): Promise<PublishProductionResult> {
  const mode: PublishMode = opts?.mode === 'redeploy' ? 'redeploy' : 'cache';
  const at = new Date().toISOString();

  try {
    revalidateStorefront();
  } catch (e) {
    return {
      ok: false,
      mode,
      cache: false,
      redeploy: { attempted: false, ok: false, skipped: true },
      at,
      reason: opts?.reason,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (mode === 'redeploy') {
    const redeploy = await triggerDeployHook();
    return {
      ok: redeploy.ok,
      mode,
      cache: true,
      redeploy,
      at,
      reason: opts?.reason,
      error: redeploy.ok ? undefined : redeploy.error,
    };
  }

  return {
    ok: true,
    mode,
    cache: true,
    redeploy: { attempted: false, ok: false, skipped: true },
    at,
    reason: opts?.reason,
  };
}

/** Fire-and-forget tras uploads: no bloquea la respuesta si falla. */
export function publishProductionSafe(reason: string): void {
  void publishProduction({ mode: 'cache', reason }).catch((err) => {
    console.error('[publish-production]', reason, err);
  });
}
