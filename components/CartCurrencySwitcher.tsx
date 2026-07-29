'use client';

// ============================================================================
// Selector de moneda — USD / Euro / Libra / Yuan / Sol / Yen…
// ============================================================================
import FlatFlag from '@/src/components/FlatFlag';
import type { DisplayCurrencyOption } from '@/lib/cart/display-currency';

interface Props {
  options: DisplayCurrencyOption[];
  value: string;
  onChange: (code: string) => void;
  t: (key: string, fallback: string) => string;
  compact?: boolean;
}

export default function CartCurrencySwitcher({
  options,
  value,
  onChange,
  t,
  compact = false,
}: Props) {
  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-white/10 bg-black/40 p-2'
          : 'rounded-xl border border-white/10 bg-black/40 p-2.5'
      }
    >
      <p
        className={`mb-2 font-mono uppercase tracking-[0.2em] text-emerald-400 ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
      >
        {t('cart.fx_title', 'Moneda · USD · Euro · Libra · Yuan · HK$')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => onChange(opt.code)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[10px] transition ${
                active
                  ? 'bg-emerald-500 font-bold text-emerald-950 shadow-md shadow-emerald-900/40'
                  : 'border border-white/10 text-slate-300 hover:border-emerald-400/40'
              }`}
              aria-pressed={active}
            >
              <span className="rounded-[2px] bg-white p-[1px] shadow-sm ring-1 ring-black/15">
                <FlatFlag
                  countryCode={opt.flagCountry === 'eu' ? 'eu' : opt.flagCountry}
                  width={compact ? 16 : 18}
                />
              </span>
              {t(opt.labelKey, opt.labelFallback)}
            </button>
          );
        })}
      </div>
      {!compact ? (
        <p className="mt-2 font-mono text-[9px] text-slate-500">
          {t(
            'cart.fx_hint',
            'USD siempre · Europa Euro · Asia Yuan / HK$ · UK Libra · eliges tú.',
          )}
        </p>
      ) : null}
    </div>
  );
}
