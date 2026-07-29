'use client';

// ============================================================================
// Preferencia de moneda de visualización (producto + carrito).
// Persistida en localStorage — el cliente elige USD / EUR / CNY / GBP / PEN…
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  defaultDisplayCurrency,
  displayCurrencyOptions,
  type DisplayCurrencyOption,
} from '@/lib/cart/display-currency';
import {
  convertToUsd,
  convertUsd,
  FALLBACK_RATES_USD,
  type FxTable,
} from '@/lib/geo/fx';
import { continentForCountry, type ShippingContinent } from '@/lib/shipping/continents';
import { formatMoney } from '@/lib/geo/regulations';

const STORAGE_KEY = 'neo.displayCurrency';

export function useDisplayCurrency(opts: {
  country: string;
  locale: string;
  zone?: ShippingContinent;
}) {
  const country = (opts.country || 'PE').slice(0, 2).toUpperCase();
  const zone = opts.zone ?? continentForCountry(country);

  const [displayCurrency, setDisplayCurrencyState] = useState(() =>
    defaultDisplayCurrency(country, zone),
  );
  const [fxRates, setFxRates] = useState<FxTable>(() => ({ ...FALLBACK_RATES_USD }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)?.toUpperCase();
      if (saved) setDisplayCurrencyState(saved);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setDisplayCurrency = useCallback((code: string) => {
    const next = code.toUpperCase();
    setDisplayCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/fx?amountUsd=1&country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((data: { ok?: boolean; rates?: FxTable }) => {
        if (cancelled || !data.ok || !data.rates) return;
        setFxRates((prev) => ({ ...prev, ...data.rates }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [country]);

  const options: DisplayCurrencyOption[] = useMemo(
    () => displayCurrencyOptions(country, zone),
    [country, zone],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!options.some((o) => o.code === displayCurrency)) {
      setDisplayCurrency(defaultDisplayCurrency(country, zone));
    }
  }, [options, displayCurrency, country, zone, hydrated, setDisplayCurrency]);

  /** Convierte un monto en `fromCurrency` → moneda elegida por el cliente. */
  const formatFrom = useCallback(
    (amountMajor: number, fromCurrency: string) => {
      const usd = convertToUsd(amountMajor, fromCurrency, fxRates);
      const shown = convertUsd(usd, displayCurrency, fxRates);
      return formatMoney(shown, displayCurrency, opts.locale);
    },
    [fxRates, displayCurrency, opts.locale],
  );

  /** Convierte USD → moneda elegida. */
  const formatUsd = useCallback(
    (amountUsd: number) => {
      const shown = convertUsd(amountUsd, displayCurrency, fxRates);
      return formatMoney(shown, displayCurrency, opts.locale);
    },
    [fxRates, displayCurrency, opts.locale],
  );

  const toUsd = useCallback(
    (amountMajor: number, fromCurrency: string) =>
      convertToUsd(amountMajor, fromCurrency, fxRates),
    [fxRates],
  );

  return {
    displayCurrency,
    setDisplayCurrency,
    options,
    fxRates,
    formatFrom,
    formatUsd,
    toUsd,
  };
}
