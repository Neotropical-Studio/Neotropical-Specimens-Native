'use client';

// ============================================================================
// Hook de garantía al comprar — textos desde checkout-config (dinámico).
// ============================================================================
import { ShieldCheck } from 'lucide-react';
import {
  PURCHASE_GUARANTEE_HOOKS,
  type PurchaseGuaranteeHook,
} from '@/lib/cart/checkout-config';

interface Props {
  t: (key: string, fallback: string) => string;
  hooks?: PurchaseGuaranteeHook[];
}

export default function CartPurchaseGuarantee({
  t,
  hooks = PURCHASE_GUARANTEE_HOOKS,
}: Props) {
  if (hooks.length === 0) return null;

  return (
    <aside
      className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 via-black/40 to-teal-950/30 p-3 ring-1 ring-emerald-400/15"
      aria-label={t('cart.guarantee_aria', 'Garantías de compra')}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
          <ShieldCheck size={18} aria-hidden />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            {t('cart.guarantee_kicker', 'Al confirmar tu compra')}
          </p>
          <p className="text-sm font-bold text-white">
            {t('cart.guarantee_headline', 'Tu respaldo Neotropical')}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {hooks.map((h) => (
          <li key={h.id} className="border-t border-white/10 pt-2 first:border-0 first:pt-0">
            <p className="text-[12px] font-semibold text-emerald-100">
              {t(h.titleKey, h.titleFallback)}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
              {t(h.bodyKey, h.bodyFallback)}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
