'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { cartLineKey, toQuoteLines } from '@/lib/cart/types';
import { quoteCart, type Profile } from '@/lib/services/cart-adaptive';
import {
  routeCheckoutByAmount,
  buildOrderBreakdown,
  GATEWAY_DISPLAY,
  EXPORT_DOCUMENT_LABEL,
  CHECKOUT_THRESHOLDS_USD,
  PERMIT_FEES_USD,
  WORLDFIRST_QR_METHODS,
  type RetailPayMethod,
} from '@/lib/payments/native-checkout';
import {
  estimateShippingUsdForCarrier,
  quoteNativeCarrier,
  CART_WEIGHT_OPTIONS_KG,
  continentalBaseRateUsd,
  STANDARD_TRANSIT_DAYS,
  CONTINENT_WEIGHT_RATES,
} from '@/lib/shipping/estimate';
import {
  listNativeCarriers,
  getCarrier,
  type NativeCarrierId,
} from '@/lib/shipping/couriers';
import {
  SHIPPING_CONTINENT_LABEL,
  continentForCountry,
  type ShippingContinent,
} from '@/lib/shipping/continents';
import {
  listEligibleInsurance,
  getInsuranceOption,
  insurancePremiumUsd,
  type InsuranceOptionId,
} from '@/lib/payments/insurance';
import {
  BUYER_KIND_OPTIONS,
  CHECKOUT_COLUMNS,
  COMMERCE_MODE_OPTIONS,
  PRODUCTS_PER_PAGE,
  ZONE_FLAG_SAMPLES,
  emptyShipTo,
  fieldsForBuyer,
  validateShipTo,
  type BuyerKind,
  type CommerceMode,
  type ShipToFormState,
  type AddressFieldId,
} from '@/lib/cart/checkout-config';
import CartUniverseBanner from '@/components/CartUniverseBanner';
import CartPurchaseGuarantee from '@/components/CartPurchaseGuarantee';
import CartCurrencySwitcher from '@/components/CartCurrencySwitcher';
import FlatFlag from '@/src/components/FlatFlag';
import { detectRubro } from '@/lib/specimens/rubros';
import { useDisplayCurrency } from '@/lib/cart/use-display-currency';
const ZONES = Object.keys(SHIPPING_CONTINENT_LABEL) as ShippingContinent[];

interface Props {
  lang: string;
  locale: string;
  country: string;
  strings: Record<string, string>;
}

type CheckoutResult = {
  orderId: string;
  totalUsd: number;
  docsMessage: string;
  qr: {
    method: string;
    qrDataUrl: string;
    amountUsd: number;
    sandbox: boolean;
    expiresAt: string;
  } | null;
  processNext: string;
};

export default function CartView({ lang, locale, country, strings }: Props) {
  const { items, ready, setQuantity, removeItem, clear, count } = useCart();
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  const [buyerKind, setBuyerKind] = useState<BuyerKind>('individual');
  const [commerceMode, setCommerceMode] = useState<CommerceMode>('ecommerce');
  const [shipTo, setShipTo] = useState<ShipToFormState>(() => emptyShipTo(country || 'PE'));
  const [zoneFilter, setZoneFilter] = useState<ShippingContinent>(() =>
    continentForCountry(country || 'PE'),
  );
  const [includeSerfor, setIncludeSerfor] = useState(false);
  const [includeSenasa, setIncludeSenasa] = useState(false);
  const [insuranceId, setInsuranceId] = useState<InsuranceOptionId | null>(null);
  const [shipWeightKg, setShipWeightKg] = useState(0.5);
  const [qrMethod, setQrMethod] = useState<RetailPayMethod>('alipay_qr');
  const [carrierId, setCarrierId] = useState<NativeCarrierId>('serpost');
  const [submitting, setSubmitting] = useState(false);
  const [docsNotice, setDocsNotice] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [page, setPage] = useState(1);

  const destCountry = (shipTo.country || country || 'PE').slice(0, 2).toUpperCase();

  // País del formulario → zona automática (filtro vivo).
  useEffect(() => {
    setZoneFilter(continentForCountry(destCountry));
  }, [destCountry]);

  const {
    displayCurrency,
    setDisplayCurrency,
    options: currencyOptions,
    formatUsd: money,
    toUsd,
  } = useDisplayCurrency({
    country: destCountry,
    locale,
    zone: zoneFilter,
  });

  const profile: Profile = {
    country: destCountry,
    segment: buyerKind === 'company' || commerceMode === 'b2b' ? 'b2b' : 'b2c',
  };

  const quote = items.length > 0 ? quoteCart(toQuoteLines(items), profile) : null;
  const quoteCurrency = (quote?.currency ?? items[0]?.currencyHint ?? 'USD').toUpperCase();

  function lineToUsd(unitPriceCents: number, qty: number): number {
    const major = (unitPriceCents * qty) / 100;
    return toUsd(major, quoteCurrency);
  }
  const parcel = useMemo(
    () => ({ weightOz: shipWeightKg * 35.274, weightKg: shipWeightKg }),
    [shipWeightKg],
  );
  const shipMeta = useMemo(
    () => continentalBaseRateUsd(destCountry, shipWeightKg),
    [destCountry, shipWeightKg],
  );
  const zoneTransit = STANDARD_TRANSIT_DAYS[zoneFilter];
  const zoneRates = CONTINENT_WEIGHT_RATES[zoneFilter];
  const shippingUsd = useMemo(
    () => estimateShippingUsdForCarrier(carrierId, destCountry, parcel),
    [carrierId, destCountry, parcel],
  );
  const allCarriers = listNativeCarriers();
  const selectedCarrier = getCarrier(carrierId);

  const rubroIds = useMemo(
    () =>
      items.map((item) => {
        if (item.rubro && item.rubro !== 'default') return item.rubro;
        return detectRubro({ scientificName: item.title, mediaHint: item.image }).id;
      }),
    [items],
  );

  const specimensUsd = quote ? toUsd(quote.total / 100, quoteCurrency) : 0;
  const permitsOnlyUsd =
    (includeSerfor ? PERMIT_FEES_USD.SERFOR : 0) + (includeSenasa ? PERMIT_FEES_USD.SENASA : 0);
  const preInsuranceUsd = Math.round((specimensUsd + permitsOnlyUsd + shippingUsd) * 100) / 100;
  const eligibleInsurance = useMemo(
    () => listEligibleInsurance(preInsuranceUsd),
    [preInsuranceUsd],
  );
  const insuranceUsd = insurancePremiumUsd(getInsuranceOption(insuranceId), preInsuranceUsd);

  useEffect(() => {
    if (insuranceId && !eligibleInsurance.some((o) => o.id === insuranceId)) {
      setInsuranceId(null);
    }
  }, [eligibleInsurance, insuranceId]);

  const breakdown = quote
    ? buildOrderBreakdown({
        specimensUsd,
        shippingUsd,
        includeSerfor,
        includeSenasa,
        insuranceUsd,
        insuranceId,
      })
    : null;
  const route = breakdown ? routeCheckoutByAmount(breakdown) : null;

  const totalPages = Math.max(1, Math.ceil(items.length / PRODUCTS_PER_PAGE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return items.slice(start, start + PRODUCTS_PER_PAGE);
  }, [items, page]);

  const addressFields = fieldsForBuyer(buyerKind);
  const columns = [...CHECKOUT_COLUMNS].sort((a, b) => a.order - b.order);

  function patchShipTo(id: AddressFieldId, value: string) {
    setShipTo((prev) => ({
      ...prev,
      [id]: id === 'country' ? value.toUpperCase().slice(0, 2) : value,
    }));
  }

  async function confirmAndEmailDocs() {
    if (!quote || !breakdown || !route) return;
    const v = validateShipTo(buyerKind, shipTo);
    if (!v.ok) {
      setDocsNotice(
        t(
          'cart.ship_incomplete',
          `Completa los datos del destinatario: ${v.missing.join(', ')}`,
        ),
      );
      return;
    }
    setSubmitting(true);
    setDocsNotice(null);
    setCheckoutResult(null);
    try {
      const res = await fetch('/api/checkout/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactEmail: shipTo.email.trim(),
          companyName:
            buyerKind === 'company' ? shipTo.companyName.trim() : shipTo.fullName.trim(),
          country: destCountry,
          vatId: shipTo.taxId.trim() || null,
          specimensUsd: breakdown.specimensUsd,
          shippingUsd: breakdown.shippingUsd,
          includeSerfor,
          includeSenasa,
          insuranceId,
          insuranceUsd: breakdown.insuranceUsd ?? 0,
          qrMethod,
          carrierId,
          locale: lang,
          shipTo: {
            buyerKind,
            commerceMode,
            ...shipTo,
            country: destCountry,
          },
          zone: zoneFilter,
          lines: items.map((i) => ({
            sku: i.sku,
            title: i.title,
            quantity: i.quantity,
            unitPriceUsd: i.unitPrice / 100,
            grade: i.grade ?? null,
            sex: i.sex ?? null,
          })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        orderId?: string;
        totalUsd?: number;
        documents?: { dryRun?: boolean; jobs?: Array<{ label: string; status: string }> };
        qr?: CheckoutResult['qr'];
        process?: { next?: string };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.orderId) {
        setDocsNotice(data.error || t('cart.docs_fail', 'No se pudo confirmar.'));
        return;
      }
      const jobs = data.documents?.jobs?.map((j) => `${j.label} (${j.status})`).join(' · ') ?? '';
      setDocsNotice(`Orden ${data.orderId} · ${jobs}`);
      setCheckoutResult({
        orderId: data.orderId,
        totalUsd: data.totalUsd ?? route.totalUsd,
        docsMessage: jobs,
        qr: data.qr ?? null,
        processNext: data.process?.next ?? '',
      });
    } catch {
      setDocsNotice(t('cart.docs_fail', 'No se pudo confirmar.'));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-sans text-sm text-white placeholder:text-slate-600';

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-slate-400">
        {t('cart.loading', 'Cargando carrito…')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-emerald-400">
            {t('cart.kicker', 'B2B · B2C · E-commerce')}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">
            {t('cart.title', 'Checkout universal')}
            {count > 0 ? (
              <span className="ml-2 font-mono text-base font-normal text-slate-400">({count})</span>
            ) : null}
          </h1>
        </div>
        <Link
          href={`/${lang}`}
          className="inline-flex items-center gap-2 font-mono text-xs text-emerald-300 hover:underline"
        >
          <ArrowLeft size={14} />
          {t('nav.back', '← Escaparate')}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/40 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto mb-4 text-slate-500" size={36} />
          <p className="text-slate-300">{t('cart.empty', 'Tu carrito está vacío.')}</p>
          <Link
            href={`/${lang}`}
            className="mt-6 inline-flex rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950"
          >
            {t('cart.browse', 'Explorar catálogo')}
          </Link>
        </div>
      ) : quote && route && breakdown ? (
        <>
          <CartUniverseBanner
            country={destCountry}
            continent={zoneFilter}
            continentLabel={SHIPPING_CONTINENT_LABEL[zoneFilter]}
            locale={locale}
            rubroIds={rubroIds}
            title={t('cart.universe_title', 'Carrito universal global')}
            subtitle={t('cart.universe_kicker', 'Dinámico · vivo · B2B/B2C')}
          />

          {/* Selector de moneda + productos paginados: 10 / página */}
          <section
            id="cart-products"
            className="rounded-2xl border border-white/10 bg-black/50 p-4"
          >
            <CartCurrencySwitcher
              options={currencyOptions}
              value={displayCurrency}
              onChange={setDisplayCurrency}
              t={t}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {t('cart.products_title', 'Ítems')} · {t('cart.page_of', 'Pág.')} {page}/
                  {totalPages}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {t('cart.showing_range', 'Mostrando')}{' '}
                  {(page - 1) * PRODUCTS_PER_PAGE + 1}–
                  {Math.min(page * PRODUCTS_PER_PAGE, items.length)} {t('cart.of', 'de')}{' '}
                  {items.length}
                  {' · '}
                  <span className="text-emerald-400/90">
                    {PRODUCTS_PER_PAGE} {t('cart.per_page_suffix', 'por página')}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-[13px] font-bold text-emerald-300">
                  {money(specimensUsd)}
                </span>
                {displayCurrency !== 'USD' ? (
                  <p className="font-mono text-[9px] text-slate-500">
                    ≈ ${specimensUsd.toFixed(2)} USD
                  </p>
                ) : null}
              </div>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {pageItems.map((item) => {
                const key = cartLineKey(item);
                const lineUsd = lineToUsd(item.unitPrice, item.quantity);
                return (
                  <li
                    key={key}
                    className="flex gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image || '/specimens/morpho-godarty-didius-tingomarensis.webp'}
                      alt=""
                      className="h-16 w-16 rounded-lg object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                      <p className="font-mono text-[10px] text-slate-500">{item.sku}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          className="text-slate-400"
                          onClick={() => setQuantity(key, item.quantity - 1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-mono text-xs text-white">{item.quantity}</span>
                        <button
                          type="button"
                          className="text-slate-400"
                          onClick={() => setQuantity(key, item.quantity + 1)}
                        >
                          <Plus size={12} />
                        </button>
                        <span className="ml-auto font-mono text-[11px] text-emerald-300">
                          {money(lineUsd)}
                        </span>
                        <button type="button" onClick={() => removeItem(key)}>
                          <Trash2 size={12} className="text-rose-300" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[2rem] rounded-lg px-2 py-1.5 font-mono text-[11px] ${
                      n === page
                        ? 'bg-emerald-500 font-bold text-emerald-950'
                        : 'border border-white/10 text-slate-300 hover:border-emerald-400/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40"
                  aria-label="Siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <p className="mt-3 text-center font-mono text-[10px] text-slate-600">
                {t('cart.single_page', 'Todos los ítems en esta página')}
              </p>
            )}
          </section>

          {/* ========== 3 CUERPOS HORIZONTALES ========== */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            {columns.map((col) => (
              <section
                key={col.id}
                className="flex min-h-[28rem] flex-col rounded-2xl border border-white/10 bg-black/55 p-4 md:p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal-400">
                  {t(col.kickerKey, col.kickerFallback)}
                </p>
                <h2 className="mt-1 text-base font-bold text-white">
                  {t(col.titleKey, col.titleFallback)}
                </h2>

                {/* —— CUERPO 1: Dirección / cliente —— */}
                {col.id === 'ship_to' ? (
                  <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {COMMERCE_MODE_OPTIONS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCommerceMode(m.id)}
                          className={`rounded-lg px-2.5 py-1 font-mono text-[10px] ${
                            commerceMode === m.id
                              ? 'bg-emerald-500 text-emerald-950'
                              : 'border border-white/10 text-slate-400'
                          }`}
                        >
                          {t(m.labelKey, m.labelFallback)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BUYER_KIND_OPTIONS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBuyerKind(b.id)}
                          className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] ${
                            buyerKind === b.id
                              ? 'bg-amber-400 text-amber-950'
                              : 'border border-white/10 text-slate-400'
                          }`}
                        >
                          {t(b.labelKey, b.labelFallback)}
                        </button>
                      ))}
                    </div>
                    {addressFields.map((f) => (
                      <label
                        key={f.id}
                        className="block font-mono text-[10px] uppercase tracking-wider text-slate-500"
                      >
                        {t(f.labelKey, f.labelFallback)}
                        {f.required ? ' *' : ''}
                        {f.id === 'country' ? (
                          <span className="mt-1 flex items-center gap-2">
                            <span className="rounded-md bg-white p-0.5 shadow ring-1 ring-white/20">
                              <FlatFlag countryCode={shipTo.country || destCountry} width={36} />
                            </span>
                            <input
                              type={f.type}
                              required={f.required}
                              value={shipTo[f.id]}
                              onChange={(e) => patchShipTo(f.id, e.target.value)}
                              placeholder={f.placeholder ?? 'PE'}
                              autoComplete={f.autoComplete}
                              maxLength={2}
                              className={`${inputClass} mt-0 uppercase`}
                            />
                          </span>
                        ) : (
                          <input
                            type={f.type}
                            required={f.required}
                            value={shipTo[f.id]}
                            onChange={(e) => patchShipTo(f.id, e.target.value)}
                            placeholder={f.placeholder}
                            autoComplete={f.autoComplete}
                            className={inputClass}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                ) : null}

                {/* —— CUERPO 2: Zona / courier / seguros / docs —— */}
                {col.id === 'transport' ? (
                  <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-teal-300">
                        {t('cart.zone_filter', 'Filtro por zona de envío')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ZONES.map((z) => {
                          const sample = (ZONE_FLAG_SAMPLES[z] ?? []).slice(0, 3);
                          const active = zoneFilter === z;
                          return (
                            <button
                              key={z}
                              type="button"
                              onClick={() => setZoneFilter(z)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[10px] ${
                                active
                                  ? 'bg-teal-500 text-teal-950'
                                  : 'border border-white/10 text-slate-400'
                              }`}
                            >
                              <span className="flex -space-x-1">
                                {sample.map((code) => (
                                  <span
                                    key={code}
                                    className="rounded-[2px] bg-white p-[1px] shadow-sm ring-1 ring-black/20"
                                  >
                                    <FlatFlag countryCode={code} width={16} />
                                  </span>
                                ))}
                              </span>
                              {SHIPPING_CONTINENT_LABEL[z]}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 font-mono text-[10px] text-slate-400">
                        {t('cart.zone_transit', 'Demora postal')}: {zoneTransit.label} · base 0.5kg $
                        {zoneRates[0]?.usd ?? '—'}
                      </p>
                    </div>

                    <label className="block font-mono text-[10px] uppercase text-slate-500">
                      {t('cart.weight', 'Peso (kg)')}
                      <select
                        value={shipWeightKg}
                        onChange={(e) => setShipWeightKg(Number(e.target.value))}
                        className={inputClass}
                      >
                        {CART_WEIGHT_OPTIONS_KG.map((kg) => (
                          <option key={kg} value={kg}>
                            {kg} kg
                          </option>
                        ))}
                      </select>
                    </label>

                    <fieldset className="space-y-1.5">
                      <legend className="font-mono text-[10px] uppercase text-slate-500">
                        {t('cart.courier_pick', 'Courier')}
                      </legend>
                      {allCarriers.map((c) => {
                        const q = quoteNativeCarrier(c.id, destCountry, parcel);
                        const checked = carrierId === c.id;
                        return (
                          <label
                            key={c.id}
                            className={`flex cursor-pointer gap-2 rounded-lg border px-2 py-2 text-[11px] ${
                              checked
                                ? 'border-teal-400/50 bg-teal-500/15 text-white'
                                : 'border-white/10 text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="courier"
                              checked={checked}
                              onChange={() => setCarrierId(c.id)}
                              className="mt-0.5 accent-teal-400"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex justify-between gap-2">
                                <span className="font-semibold">{c.label}</span>
                                <span className="font-mono text-teal-300">
                                  ${q.rateUsd.toFixed(0)}
                                </span>
                              </span>
                              <span className="font-mono text-[9px] text-slate-500">
                                {SHIPPING_CONTINENT_LABEL[zoneFilter]} · {q.deliveryLabel}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>

                    <div className="space-y-1.5 border-t border-white/10 pt-3">
                      <p className="font-mono text-[10px] uppercase text-amber-300">
                        {t('cart.permits_checks', 'Trámites / permisos')}
                      </p>
                      {(
                        [
                          {
                            id: 'serfor' as const,
                            checked: includeSerfor,
                            set: setIncludeSerfor,
                            fee: PERMIT_FEES_USD.SERFOR,
                            label: 'SERFOR',
                          },
                          {
                            id: 'senasa' as const,
                            checked: includeSenasa,
                            set: setIncludeSenasa,
                            fee: PERMIT_FEES_USD.SENASA,
                            label: 'SENASA',
                          },
                        ] as const
                      ).map((p) => (
                        <label
                          key={p.id}
                          className={`flex cursor-pointer gap-2 rounded-lg border px-2 py-2 text-[11px] ${
                            p.checked
                              ? 'border-amber-400/40 bg-amber-500/10'
                              : 'border-white/10 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={p.checked}
                            onChange={(e) => p.set(e.target.checked)}
                            className="accent-amber-400"
                          />
                          <span className="flex-1">
                            {p.label}
                            <span className="float-right font-mono">${p.fee}</span>
                          </span>
                        </label>
                      ))}
                    </div>

                    {eligibleInsurance.length > 0 ? (
                      <div className="space-y-1.5 border-t border-white/10 pt-3">
                        <p className="font-mono text-[10px] uppercase text-sky-300">
                          {t('cart.insurance_title', 'Seguro (opcional)')}
                        </p>
                        <label className="flex gap-2 text-[11px] text-slate-400">
                          <input
                            type="radio"
                            name="ins"
                            checked={insuranceId === null}
                            onChange={() => setInsuranceId(null)}
                          />
                          {t('cart.insurance_none', 'Sin seguro')} $0
                        </label>
                        {eligibleInsurance.map((opt) => {
                          const premium = insurancePremiumUsd(opt, preInsuranceUsd);
                          return (
                            <label
                              key={opt.id}
                              className="flex gap-2 text-[11px] text-slate-300"
                            >
                              <input
                                type="radio"
                                name="ins"
                                checked={insuranceId === opt.id}
                                onChange={() => setInsuranceId(opt.id)}
                              />
                              <span className="flex-1">
                                {opt.label}
                                <span className="float-right font-mono">
                                  ${premium.toFixed(0)}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="mt-auto border-t border-white/10 pt-3">
                      <p className="font-mono text-[10px] uppercase text-slate-500">
                        {t('cart.docs_title', 'Documentos al confirmar')}
                      </p>
                      <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-slate-400">
                        {route.documents.onOrderConfirm.map((k) => (
                          <li key={k}>• {EXPORT_DOCUMENT_LABEL[k]}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {/* —— CUERPO 3: Resumen —— */}
                {col.id === 'summary' ? (
                  <div className="mt-3 flex flex-1 flex-col gap-3">
                    <CartCurrencySwitcher
                      options={currencyOptions}
                      value={displayCurrency}
                      onChange={setDisplayCurrency}
                      t={t}
                    />
                    <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between gap-2">
                        <span>{t('cart.line_specimens', 'Especímenes')}</span>
                        <span className="text-right">{money(breakdown.specimensUsd)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>SERFOR {includeSerfor ? '✓' : '—'}</span>
                        <span>
                          {includeSerfor ? money(PERMIT_FEES_USD.SERFOR) : money(0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>SENASA {includeSenasa ? '✓' : '—'}</span>
                        <span>
                          {includeSenasa ? money(PERMIT_FEES_USD.SENASA) : money(0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>
                          {selectedCarrier?.label} · {SHIPPING_CONTINENT_LABEL[zoneFilter]}
                        </span>
                        <span>{money(breakdown.shippingUsd)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Seguro {insuranceId ? '✓' : '—'}</span>
                        <span>{money(breakdown.insuranceUsd ?? 0)}</span>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-white/15 pt-2 text-sm font-black text-white">
                        <span>{t('cart.day_total', 'Total del día')}</span>
                        <span className="text-right text-emerald-300">
                          {money(route.totalUsd)}
                        </span>
                      </div>
                      {displayCurrency !== 'USD' ? (
                        <p className="pt-1 text-right font-mono text-[9px] text-slate-500">
                          {t('cart.fx_usd_ref', 'Referencia cobro')} · $
                          {route.totalUsd.toFixed(2)} USD
                        </p>
                      ) : null}
                    </div>

                    <p className="font-mono text-[10px] text-slate-500">
                      {shipTo.fullName || '—'} · {shipTo.city || '—'}, {destCountry}{' '}
                      {shipTo.postalCode ? `· ${shipTo.postalCode}` : ''}
                      <br />
                      {shipTo.street1 || t('cart.address_pending', 'Dirección pendiente')}
                      <br />
                      {buyerKind === 'company' && shipTo.companyName
                        ? `${shipTo.companyName}${shipTo.taxId ? ` · ${shipTo.taxId}` : ''}`
                        : null}
                    </p>

                    {route.segment === 'retail_fast' ? (
                      <div className="flex flex-wrap gap-1">
                        {WORLDFIRST_QR_METHODS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setQrMethod(m)}
                            className={`rounded px-2 py-1 font-mono text-[9px] ${
                              qrMethod === m
                                ? 'bg-emerald-500 text-emerald-950'
                                : 'border border-white/10 text-slate-400'
                            }`}
                          >
                            {GATEWAY_DISPLAY[m]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-sky-300">XTransfer B2B</p>
                    )}

                    <p className="font-mono text-[9px] text-slate-600">
                      {route.segment === 'retail_fast'
                        ? `$${CHECKOUT_THRESHOLDS_USD.retailMin}–$${CHECKOUT_THRESHOLDS_USD.retailMaxExclusive}`
                        : 'Mayorista'}{' '}
                      · {commerceMode.toUpperCase()} · {buyerKind}
                    </p>

                    {docsNotice ? (
                      <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 font-mono text-[10px] text-emerald-200">
                        {docsNotice}
                      </p>
                    ) : null}

                    {checkoutResult?.qr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={checkoutResult.qr.qrDataUrl}
                        alt="QR"
                        className="mx-auto h-36 w-36 rounded-lg bg-white p-2"
                      />
                    ) : null}

                    <CartPurchaseGuarantee t={t} />

                    <div className="mt-auto flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void confirmAndEmailDocs()}
                        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-emerald-950 disabled:opacity-60"
                      >
                        {submitting
                          ? t('cart.sending_docs', 'Confirmando…')
                          : t('cart.confirm', 'Confirmar compra')}
                      </button>
                      <button
                        type="button"
                        onClick={clear}
                        className="w-full rounded-xl border border-white/10 py-2 text-xs text-slate-300"
                      >
                        {t('cart.clear', 'Vaciar')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
