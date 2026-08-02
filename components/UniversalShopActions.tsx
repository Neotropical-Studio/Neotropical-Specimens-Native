'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

type Props = {
  backHref: string;
  backLabel: string;
  continueHref: string;
  continueLabel: string;
  buyLabel: string;
  onBuy: () => void;
  buying?: boolean;
  /** sticky inferior en móvil (carrito / resumen). */
  stickyMobile?: boolean;
};

/**
 * Barra universal: Regresar · Comprar · Continuar comprando
 * Responsive: 1 col móvil → 3 col tablet/PC. Touch ≥44px. Safe-area.
 */
export default function UniversalShopActions({
  backHref,
  backLabel,
  continueHref,
  continueLabel,
  buyLabel,
  onBuy,
  buying = false,
  stickyMobile = false,
}: Props) {
  const btn =
    'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide transition touch-manipulation active:scale-[0.99] sm:min-h-[44px] sm:text-xs md:text-sm';

  const bar = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Link
        href={backHref}
        className={`${btn} border border-white/20 bg-black/50 text-white/90 hover:border-emerald-400/50 hover:text-emerald-200`}
      >
        <ArrowLeft size={16} aria-hidden className="shrink-0" />
        <span className="truncate">{backLabel}</span>
      </Link>
      <button
        type="button"
        disabled={buying}
        onClick={onBuy}
        className={`${btn} bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-60`}
      >
        <ShoppingBag size={16} aria-hidden className="shrink-0" />
        <span className="truncate">{buyLabel}</span>
      </button>
      <Link
        href={continueHref}
        className={`${btn} border border-emerald-500/45 bg-emerald-500/15 text-emerald-200 hover:border-emerald-400/70 hover:bg-emerald-500/25`}
      >
        <span className="truncate">{continueLabel}</span>
      </Link>
    </div>
  );

  if (!stickyMobile) return bar;

  return (
    <>
      <div className="hidden sm:block">{bar}</div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden">
        <div
          className="pointer-events-auto border-t border-white/10 bg-black/90 px-3 pt-2 backdrop-blur-md"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {bar}
        </div>
      </div>
    </>
  );
}
