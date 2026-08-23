'use client';

// ============================================================================
// Ficha de producto 100% dinámica y agnóstica. NO contiene datos de espécimen
// ni textos de negocio: recibe el espécimen (Supabase), el mapa de cadenas i18n
// (Sanity + MT, resuelto en servidor), la paleta taxonómica, la divisa/locale
// geo, el aviso regulatorio y la campaña activa (si hay). Se sincroniza en
// vivo con la fila del espécimen.
// ============================================================================
import { useMemo, useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import 'flag-icons/css/flag-icons.css';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { extractDominantPaletteFromImage } from '@/lib/specimens/visual';
import {
  sealMorphoDetailView,
  type SpecimenDetailView,
} from '@/lib/specimens/detail';
import { type Regulatory } from '@/lib/geo/regulations';
import { quoteCart, type CartLine, type Profile, type Quote } from '@/lib/services/cart-adaptive';
import { imageUrl, modelUrl } from '@/lib/cloudinary/url';
import { GRADE_OPTIONS } from '@/lib/constants/grades';
import { SEX_LABEL } from '@/lib/constants/sex';
import { resolveTaxonPalette } from '@/lib/theme/taxon';
import type { ThemePalette } from '@/lib/theme/palette';
import type { ActiveCampaignBanner } from '@/lib/campaigns/getActive';
import {
  isMorphoGodartyDidiusTingomarensis,
  MORPHO_GODARTY_NATIVE,
} from '@/lib/specimens/native/morphoGodartyDidiusTingomarensis';
import { MORPHO_CARD_URL, MORPHO_HERO_URL, MORPHO_VENTRAL_URL } from '@/lib/cloudinary/specimens';
import { pickRelatedSpecimens } from '@/lib/specimens/related';
import { useCart } from '@/components/CartProvider';
import { useDisplayCurrency } from '@/lib/cart/use-display-currency';
import CartCurrencySwitcher from '@/components/CartCurrencySwitcher';
import CamaleonicSpecimenViewer from './CamaleonicSpecimenViewer';
import PeruNationalFlag from './PeruNationalFlag';

interface Props {
  specimen: SpecimenDetailView;
  /** Catálogo relacionado precargado en servidor (evita sección vacía). */
  relatedCatalog?: SpecimenDetailView[];
  /** Volver a familia / categoría del árbol de catálogo. */
  catalogueTrail?: {
    familyHref: string | null;
    familyLabel: string | null;
    categoryHref: string | null;
    categoryLabel: string | null;
  } | null;
  strings: Record<string, string>;
  lang: string;
  dir: 'ltr' | 'rtl';
  locale: string;
  currency: string;
  palette: ThemePalette;
  regulatory: Regulatory;
  campaign: ActiveCampaignBanner | null;
}

type MediaKey = '3d' | 'dorsal' | 'ventral' | 'lateral' | 'macro';

// Etiquetas de la protocolo museográfico de captura: 4 tomas fijas por
// espécimen. Sólo se muestra la pestaña de una toma si existe el recurso real
// (specimen.views[...] viene de multimedia cargada, nunca inventada aquí).
// Tamaño del pool que se trae para armar el catálogo dinámico y cuántas
// tarjetas se muestran finalmente (mezcla misma-familia / otras-categorías).

const VIEW_LABELS: Record<Exclude<MediaKey, '3d'>, { key: string; fallback: string }> = {
  dorsal: { key: 'media.dorsal', fallback: 'Vista 1: Dorsal' },
  ventral: { key: 'media.ventral', fallback: 'Vista 2: Ventral' },
  lateral: { key: 'media.lateral', fallback: 'Vista 3: Detalle / Antenas' },
  macro: { key: 'media.macro', fallback: 'Vista 4: Macro Escama' },
};

export default function SpecimenDetail({
  specimen: initial,
  relatedCatalog = [],
  catalogueTrail = null,
  strings,
  lang,
  dir,
  locale,
  currency,
  palette,
  regulatory,
  campaign,
}: Props) {
  const [specimenRaw, setSpecimen] = useState(initial);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [paletteState, setPaletteState] = useState<ThemePalette>(palette);
  const [recommendations, setRecommendations] = useState<SpecimenDetailView[]>(relatedCatalog);
  const [zoomed, setZoomed] = useState(false);
  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  // Morpho: sello infalible — nunca props vacías aunque el sync falle.
  const isMorpho = isMorphoGodartyDidiusTingomarensis({
    id: specimenRaw.id,
    scientificName: specimenRaw.scientificName,
  });
  const specimen = isMorpho ? sealMorphoDetailView(specimenRaw) : specimenRaw;
  const morphoCampaign: ActiveCampaignBanner | null = isMorpho
    ? campaign ?? {
        id: 'native-morpho-godarty-tingo',
        title: MORPHO_GODARTY_NATIVE.campaignTitle,
        banner: {},
        discountPercent: MORPHO_GODARTY_NATIVE.campaignDiscountPercent,
      }
    : campaign;

  // --- Media disponible (dinámica: sólo tomas con recurso real) ---------------
  const mediaTabs = useMemo<Array<{ key: MediaKey; label: string }>>(() => {
    const tabs: Array<{ key: MediaKey; label: string }> = [];
    if (specimen.model3d) tabs.push({ key: '3d', label: t('media.view_3d', 'Vista 3D') });
    (Object.keys(VIEW_LABELS) as Array<Exclude<MediaKey, '3d'>>).forEach((v) => {
      if (specimen.views[v]) tabs.push({ key: v, label: t(VIEW_LABELS[v].key, VIEW_LABELS[v].fallback) });
    });
    return tabs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specimen, strings]);

  const [active, setActive] = useState<MediaKey>(mediaTabs[0]?.key ?? 'dorsal');
  const [tier, setTier] = useState<'retail' | 'wholesale'>('retail');

  // Si cambia el set de media (por sync en vivo), reencuadra la pestaña activa.
  useEffect(() => {
    if (!mediaTabs.some((m) => m.key === active)) setActive(mediaTabs[0]?.key ?? 'dorsal');
  }, [mediaTabs, active]);

  const galleryItems = useMemo(() => {
    const unique = [
      specimen.views.dorsal,
      specimen.views.ventral,
      specimen.views.lateral,
      specimen.views.macro,
      specimen.primaryImage,
      specimen.secondaryImage,
    ].filter((value): value is string => Boolean(value));
    return Array.from(new Set(unique));
  }, [specimen]);

  useEffect(() => {
    if (!galleryItems.length) return;
    const timer = window.setInterval(() => {
      setGalleryIndex((current) => (current + 1) % galleryItems.length);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [galleryItems.length]);

  useEffect(() => {
    const primary = galleryItems[galleryIndex] ?? specimen.primaryImage;
    if (!primary) return;
    let alive = true;
    void extractDominantPaletteFromImage(imageUrl(primary, ['w_320', 'ar_1:1', 'c_fill']), {
      primary: paletteState.primary,
      accent: paletteState.accent,
      surface: paletteState.surface,
      text: paletteState.text,
    }).then((next) => {
      if (alive) setPaletteState(next);
    });
    return () => {
      alive = false;
    };
  }, [galleryIndex, galleryItems, paletteState.accent, paletteState.primary, paletteState.surface, paletteState.text, specimen.primaryImage]);

  // Alinea estado local si el servidor entrega una ficha fresca (navegación).
  useEffect(() => {
    setSpecimen(initial);
  }, [initial]);

  // Catálogo dinámico: SSR primero; luego refresco vía API + Supabase.
  useEffect(() => {
    setRecommendations(relatedCatalog);
  }, [relatedCatalog]);

  useEffect(() => {
    let alive = true;

    const applyPool = (pool: SpecimenDetailView[]) => {
      if (!alive) return;
      setRecommendations(pickRelatedSpecimens(pool, specimen));
    };

    const loadRecommendations = async () => {
      // 1) API propia (misma fuente que el escaparate / listado).
      try {
        const res = await fetch(
          `/api/catalog/specimens?detail=1&lang=${encodeURIComponent(lang)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const data = (await res.json()) as { specimens?: SpecimenDetailView[] };
          const pool = Array.isArray(data.specimens) ? data.specimens : [];
          if (pool.length > 0) {
            applyPool(pool);
            return;
          }
        }
      } catch {
        /* fallback abajo */
      }

      // Último recurso: mantener SSR o el propio espécimen.
      if (alive && relatedCatalog.length === 0) {
        applyPool([specimen]);
      }
    };

    void loadRecommendations();

    let cleanupChannel = () => {};
    try {
      const supabase = getSupabaseBrowser();
      const channel = supabase
        .channel(`specimen-recs-${initial.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'specimens' }, () => {
          void loadRecommendations();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'specimen_media' }, () => {
          void loadRecommendations();
        })
        .subscribe();
      cleanupChannel = () => {
        supabase.removeChannel(channel);
      };
    } catch {
      /* sin realtime */
    }

    return () => {
      alive = false;
      cleanupChannel();
    };
  }, [specimen.id, specimen.family, specimen.rubroId, specimen.order, lang, initial.id, relatedCatalog]);

  // --- Sincronización en vivo con la fila del espécimen + su media ----------
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    try {
      const supabase = getSupabaseBrowser();
      const refresh = async () => {
        const response = await fetch(
          `/api/catalog/specimens/${encodeURIComponent(initial.id)}?lang=${encodeURIComponent(lang)}`,
          { cache: 'no-store' },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { specimen?: SpecimenDetailView | null };
        if (alive && data.specimen) setSpecimen(data.specimen);
      };
      const channel = supabase
        .channel(`specimen-${initial.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'specimens', filter: `id=eq.${initial.id}` },
          () => {
            void refresh();
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'specimen_media',
            filter: `specimen_id=eq.${initial.id}`,
          },
          () => {
            void refresh();
          },
        )
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    } catch {
      /* Supabase no configurado: la ficha permanece con los datos del servidor. */
    }
    return () => {
      alive = false;
      cleanup();
    };
  }, [initial.id, lang]);

  // --- Precio adaptativo (impuesto/divisa por perfil geo + oferta de campaña) -
  const wholesaleActive = tier === 'wholesale' && specimen.wholesalePrice != null;
  const baseUnit = wholesaleActive ? specimen.wholesalePrice! : specimen.price;
  // La oferta de campaña sólo aplica a menudeo: el mayoreo ya trae su propio
  // precio negociado por volumen. Morpho: -15% garantizado.
  const discountPercent = !wholesaleActive
    ? morphoCampaign?.discountPercent ?? (isMorpho ? MORPHO_GODARTY_NATIVE.campaignDiscountPercent : null)
    : null;
  const unit = baseUnit != null && discountPercent ? baseUnit * (1 - discountPercent / 100) : baseUnit;
  const qty = wholesaleActive ? specimen.wholesaleMinQty ?? 1 : 1;

  const { quote, originalQuote } = useMemo<{ quote: Quote | null; originalQuote: Quote | null }>(() => {
    const build = (amount: number | null): Quote | null => {
      if (amount == null) return null;
      const line: CartLine = {
        id: specimen.id,
        sku: specimen.code,
        title: specimen.scientificName,
        quantity: qty,
        unitPrice: Math.round(amount * 100),
        rubro: 'specimens-3d',
      };
      const profile: Profile = {
        country: regulatory.country ?? 'PE',
        segment: wholesaleActive ? 'wholesale' : 'b2c',
      };
      return quoteCart([line], profile);
    };
    return {
      quote: build(unit),
      originalQuote: discountPercent ? build(baseUnit) : null,
    };
  }, [unit, baseUnit, discountPercent, qty, wholesaleActive, specimen.id, specimen.code, specimen.scientificName, regulatory.country]);

  const quoteCurrency = (quote?.currency ?? currency ?? specimen.currency ?? 'PEN').toUpperCase();
  const {
    displayCurrency,
    setDisplayCurrency,
    options: currencyOptions,
    formatFrom,
  } = useDisplayCurrency({
    country: regulatory.country ?? 'PE',
    locale,
  });
  const priceLabel = quote
    ? formatFrom(quote.total / 100, quoteCurrency)
    : t('product.inquire', 'Consultar precio');
  const originalPriceLabel = originalQuote
    ? formatFrom(originalQuote.total / 100, quoteCurrency)
    : null;
  const taxLabel =
    quote && quote.tax > 0 ? formatFrom(quote.tax / 100, quoteCurrency) : null;

  const accent = paletteState.accent;
  const primary = paletteState.primary;
  const currentImage = galleryItems[galleryIndex] ?? specimen.primaryImage;

  const gradeOption = GRADE_OPTIONS.find((g) => g.code === specimen.grade);
  const gradeBadgeLabel = gradeOption
    ? `${t('product.grade_museum_label', 'Grado Museo')} ${gradeOption.label}`
    : specimen.gradeName ?? specimen.grade ?? 'A.1';
  const gradeOptions = useMemo(() => {
    const opts = GRADE_OPTIONS.map((g) => ({
      value: g.code,
      label: `${g.label} (${gradeQualifier(g.name)} / ${t('product.museum_qualifier', 'Museo')})`,
    }));
    if (specimen.grade && !opts.some((o) => o.value === specimen.grade)) {
      opts.unshift({
        value: specimen.grade,
        label: specimen.gradeName ?? specimen.grade,
      });
    }
    return opts;
  }, [specimen.grade, specimen.gradeName, strings]); // eslint-disable-line react-hooks/exhaustive-deps

  const sexOptions = useMemo(
    () =>
      Object.entries(SEX_LABEL).map(([code, meta]) => ({
        value: code,
        label: t(meta.key, meta.fallback),
      })),
    [strings], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [selectedGrade, setSelectedGrade] = useState(specimen.grade ?? 'A1');
  const [selectedSex, setSelectedSex] = useState(specimen.sex ?? 'M');
  const { addItem, count, ready } = useCart();
  const router = useRouter();

  useEffect(() => {
    setSelectedGrade(specimen.grade ?? (isMorpho ? 'A1' : gradeOptions[0]?.value ?? ''));
  }, [specimen.grade, isMorpho, gradeOptions]);

  useEffect(() => {
    setSelectedSex(specimen.sex ?? (isMorpho ? 'M' : sexOptions[0]?.value ?? ''));
  }, [specimen.sex, isMorpho, sexOptions]);

  // Solo cablea el botón existente — sin cambiar el diseño de la ficha.
  const handleAddToCart = useCallback(() => {
    if (unit == null || specimen.stock <= 0) return;
    const thumb = isMorpho
      ? MORPHO_HERO_URL
      : specimen.primaryImage
        ? imageUrl(specimen.primaryImage, ['w_160', 'c_fit', 'f_auto'])
        : null;
    addItem({
      id: specimen.id,
      sku: specimen.code,
      title: specimen.scientificName,
      quantity: qty,
      unitPrice: Math.round(unit * 100),
      rubro: 'specimens-3d',
      href: `/${lang}/product/${specimen.id}`,
      image: thumb,
      grade: selectedGrade || specimen.grade,
      sex: selectedSex || specimen.sex,
      tier: wholesaleActive ? 'wholesale' : 'retail',
      currencyHint: quoteCurrency,
    });
    router.push(`/${lang}/cart`);
  }, [
    unit,
    specimen.stock,
    specimen.id,
    specimen.code,
    specimen.scientificName,
    specimen.primaryImage,
    specimen.grade,
    specimen.sex,
    isMorpho,
    qty,
    lang,
    selectedGrade,
    selectedSex,
    wholesaleActive,
    quoteCurrency,
    addItem,
    router,
  ]);

  const handleBulkInquiry = useCallback(() => {
    setTier('wholesale');
    const wa = process.env.NEXT_PUBLIC_WHATSAPP_E164?.replace(/\D/g, '');
    const msg = encodeURIComponent(
      [
        t('cart.bulk_intro', 'Consulta de lotes al mayor:'),
        specimen.scientificName,
        `SKU ${specimen.code}`,
        `Grade ${selectedGrade || specimen.grade || '—'}`,
        `Sex ${selectedSex || specimen.sex || '—'}`,
        `https://neotropicalspecimens.com/${lang}/product/${specimen.id}`,
      ].join('\n'),
    );
    if (wa) {
      window.open(`https://wa.me/${wa}?text=${msg}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = `mailto:contacto@houseinsectsofperu.com?subject=${encodeURIComponent(
      `Lotes ${specimen.code}`,
    )}&body=${msg}`;
  }, [specimen, selectedGrade, selectedSex, lang, strings]); // eslint-disable-line react-hooks/exhaustive-deps

  const sexDisplay = specimen.sex
    ? t(SEX_LABEL[specimen.sex]?.key ?? 'sex.unknown', SEX_LABEL[specimen.sex]?.fallback ?? specimen.sex)
    : isMorpho
      ? t('sex.male', 'Male ♂')
      : null;

  const showPurchaseTiers = isMorpho || specimen.wholesalePrice != null;
  const campaignTitle = morphoCampaign?.title ?? MORPHO_GODARTY_NATIVE.campaignTitle;

  // Morpho: dorsal (hero) vs ventral (reverso WebP) según pestaña / galería activa.
  const morphoSrcOverride = (() => {
    if (!isMorpho) return null;
    if (active === 'ventral') return MORPHO_VENTRAL_URL;
    if (
      currentImage &&
      (currentImage === specimen.views.ventral ||
        currentImage === specimen.secondaryImage ||
        currentImage.includes('ventral') ||
        currentImage.includes('reverso') ||
        currentImage.includes('i9gcnn'))
    ) {
      return MORPHO_VENTRAL_URL;
    }
    return MORPHO_HERO_URL;
  })();

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-screen pb-20 pt-[108px] text-slate-100 antialiased"
      style={{ background: `radial-gradient(circle at center, ${hexA(primary, 0.18)} 0%, ${paletteState.surface} 70%)` }}
    >
      {/* Barra de ficha: volver + moneda + carrito (bajo el Header fijo del sitio) */}
      <header
        className="sticky z-30 border-b border-white/10 bg-black/70 px-3 py-3 backdrop-blur sm:px-6"
        style={{ top: 'max(108px, env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {catalogueTrail?.familyHref && catalogueTrail.familyLabel ? (
              <Link
                href={catalogueTrail.familyHref}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-center font-mono text-xs text-emerald-200 transition hover:border-emerald-400/55 hover:bg-emerald-500/15 touch-manipulation sm:w-auto sm:justify-start"
              >
                {t('nav.back_family', `← Volver a ${catalogueTrail.familyLabel}`)}
              </Link>
            ) : null}
            {catalogueTrail?.categoryHref && catalogueTrail.categoryLabel ? (
              <Link
                href={catalogueTrail.categoryHref}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center font-mono text-xs text-white/75 transition hover:border-emerald-400/40 hover:text-emerald-200 touch-manipulation sm:w-auto sm:justify-start"
              >
                {t(
                  'nav.back_families_catalog',
                  `← Volver al catálogo de familias · ${catalogueTrail.categoryLabel}`,
                )}
              </Link>
            ) : (
              <Link
                href={`/${lang}/catalogue`}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-emerald-500/30 px-3 py-2 font-mono text-xs text-emerald-300 touch-manipulation sm:w-auto"
              >
                {t('nav.back', '← Volver al Catálogo')}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            {morphoCampaign && discountPercent != null ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
                + {t('product.campaign_label', 'Campaña')}: {campaignTitle} (-{discountPercent}%)
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] text-amber-400">
                {t(`regulatory.${regulatory.citesStatus}`, 'No-CITES · espécimen legal para comercio')}
              </span>
            )}
            <Link
              href={`/${lang}/cart`}
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-emerald-300 transition hover:border-emerald-400/40 hover:bg-white/5"
              aria-label={t('nav.cart', 'Carrito')}
            >
              <ShoppingBag size={16} />
              {ready && count > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 font-mono text-[10px] font-bold text-emerald-950">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Panel izquierdo: foto → dorsal/ventral → catálogo dinámico */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="relative flex min-h-[380px] items-center justify-center overflow-visible bg-transparent md:min-h-[480px]">
              {/* Badge superior de oferta: Morpho siempre -15% */}
              {(discountPercent != null || isMorpho) && (
                <span className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-red-600 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg">
                  {t('product.campaign_offer', 'Oferta de campaña')} (-
                  {discountPercent ?? MORPHO_GODARTY_NATIVE.campaignDiscountPercent}%)
                </span>
              )}

              {active === '3d' && specimen.model3d ? (
                <CamaleonicSpecimenViewer
                  modelUrl={modelUrl(specimen.model3d)}
                  accent={accent}
                  surface={palette.surface}
                  statusLabel={t('system.render_engine', 'MOTOR DE RENDER // 3D EN TIEMPO REAL')}
                />
              ) : (
                <div className="relative flex h-full min-h-[380px] w-full items-center justify-center bg-transparent md:min-h-[480px]">
                  <ActiveImage
                    publicId={isMorpho ? null : currentImage ?? specimen.views[active as Exclude<MediaKey, '3d'>]}
                    srcOverride={morphoSrcOverride}
                    alt={specimen.scientificName}
                    floating
                    chameleon={isMorpho}
                    accent={accent}
                  />
                  {!isMorpho && (
                    <button
                      onClick={() => setZoomed((value) => !value)}
                      className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur"
                    >
                      {zoomed ? t('product.zoom_out', 'Cerrar zoom') : t('product.zoom_in', 'Zoom macro')}
                    </button>
                  )}
                  {zoomed && !isMorpho && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl(currentImage ?? specimen.primaryImage ?? '', ['f_png', 'w_1600', 'c_fit'])}
                        alt={specimen.scientificName}
                        className="max-h-full max-w-full bg-transparent object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {galleryItems.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {galleryItems.map((item, index) => {
                  const thumbOn = galleryIndex === index;
                  const thumbIsMorphoVentral =
                    isMorpho &&
                    (item === specimen.views.ventral ||
                      item === specimen.secondaryImage ||
                      item.includes('reverso') ||
                      item.includes('i9gcnn') ||
                      item.includes('ventral'));
                  const thumbSrc = isMorpho
                    ? thumbIsMorphoVentral
                      ? MORPHO_VENTRAL_URL
                      : MORPHO_HERO_URL
                    : imageUrl(item, ['w_120', 'ar_1:1', 'c_fill']);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setGalleryIndex(index);
                        if (thumbIsMorphoVentral) setActive('ventral');
                        else if (isMorpho) setActive('dorsal');
                      }}
                      className={
                        thumbOn
                          ? 'h-16 w-16 overflow-hidden rounded-xl border-2 bg-black/40 transition-shadow'
                          : 'h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40 transition-shadow'
                      }
                      style={
                        thumbOn
                          ? {
                              borderColor: accent,
                              boxShadow: `0 0 0 1px ${hexA(accent, 0.55)}, 0 0 14px 2px ${hexA(accent, 0.55)}`,
                            }
                          : undefined
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbSrc} className="h-full w-full object-contain bg-transparent" alt="" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pestañas de navegación de vistas: Dorsal / Ventral / Detalle-Antenas / Macro Escama */}
            {mediaTabs.length > 0 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${mediaTabs.length}, minmax(0,1fr))` }}>
                {mediaTabs.map((m, i) => {
                  const on = active === m.key;
                  const [kicker, ...rest] = m.label.split(':');
                  const value = rest.length ? rest.join(':').trim() : m.label;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setActive(m.key)}
                      className={
                        on
                          ? 'rounded-xl border-2 bg-black/40 p-2.5 text-center transition-all'
                          : 'rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-center transition-all'
                      }
                      style={
                        on
                          ? {
                              borderColor: accent,
                              background: hexA(accent, 0.12),
                              boxShadow: `0 0 0 1px ${hexA(accent, 0.45)}, 0 0 16px 3px ${hexA(accent, 0.5)}`,
                            }
                          : undefined
                      }
                    >
                      <span className="block text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                        {rest.length ? kicker.trim() : `${t('media.view_generic', 'Vista')} ${i + 1}`}
                      </span>
                      <span className="block text-xs font-bold uppercase" style={{ color: on ? accent : '#94a3b8' }}>
                        {value}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* SIEMPRE debajo de Dorsal/Ventral — columna izquierda, NUNCA junto al carrito */}
            <section
              id="catalogo-dinamico"
              className="scroll-mt-28 rounded-2xl border border-emerald-500/40 bg-black/40 p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)] sm:p-5"
            >
              <div className="mb-4">
                <span
                  className="block text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300"
                >
                  {t('product.dynamic_catalog_title', 'Catálogo dinámico e inteligente')}
                </span>
                <h2 className="mt-1 text-base font-extrabold leading-snug text-white sm:text-lg">
                  {t(
                    'product.dynamic_catalog_subtitle',
                    'Seleccione un espécimen para adaptar el visor, colores y galería en tiempo real',
                  )}
                </h2>
              </div>
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {recommendations.slice(0, 4).map((item) => {
                    const itemAccent = resolveTaxonPalette({
                      order: item.order,
                      family: item.family,
                      subfamily: item.subfamily,
                      override: item.themeOverride,
                    }).accent;
                    const itemPrice =
                      item.price != null
                        ? formatFrom(item.price, (item.currency || quoteCurrency).toUpperCase())
                        : null;
                    const itemIsMorpho = isMorphoGodartyDidiusTingomarensis({
                      id: item.id,
                      scientificName: item.scientificName,
                    });
                    const thumbSrc = itemIsMorpho
                      ? MORPHO_CARD_URL
                      : item.primaryImage || item.secondaryImage
                        ? imageUrl(item.primaryImage ?? item.secondaryImage ?? '', [
                            'w_480',
                            'ar_4:3',
                            'c_fill',
                          ])
                        : null;
                    return (
                      <Link
                        key={item.id}
                        href={`/${lang}/product/${item.id}`}
                        className="group rounded-xl border border-white/10 bg-black/40 p-2 transition hover:border-white/20"
                      >
                        <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-900">
                          {thumbSrc ? (
                            <Image
                              src={thumbSrc}
                              alt={item.scientificName}
                              fill
                              sizes="(max-width: 1024px) 45vw, 25vw"
                              className={
                                itemIsMorpho
                                  ? 'object-contain p-1.5 transition-transform duration-500 group-hover:scale-105'
                                  : 'object-cover transition-transform duration-500 group-hover:scale-105'
                              }
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-black text-[9px] uppercase tracking-widest text-neutral-600">
                              {t('media.no_image', 'Sin imagen')}
                            </div>
                          )}
                          {(item.family ?? item.order) && (
                            <span
                              className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                              style={{ background: hexA(itemAccent, 0.85), color: '#050807' }}
                            >
                              {item.family ?? item.order}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs font-semibold italic text-white">
                          {item.scientificName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">
                          {[item.commonName, item.country].filter(Boolean).join(' · ')}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          {itemPrice ? (
                            <span className="text-xs font-bold" style={{ color: itemAccent }}>
                              {itemPrice}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 transition-colors group-hover:text-white">
                            {t('product.activate_viewer', 'Activar Visor')} →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/40 px-4 py-6 text-center">
                  <p className="text-xs font-semibold text-white">
                    {t(
                      'product.dynamic_catalog_empty_title',
                      'Catálogo listo para recepción de inventario',
                    )}
                  </p>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {t(
                      'product.dynamic_catalog_empty_subtitle',
                      'Cuando se sincronicen más especímenes de los 3 rubros, aparecerán aquí automáticamente.',
                    )}
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Panel derecho: información taxonómica y compra */}
          <div className="space-y-6 lg:col-span-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase"
                  style={{ borderColor: hexA(accent, 0.4), background: hexA(accent, 0.1), color: accent }}
                >
                  {gradeBadgeLabel}
                </span>
                <span className="font-mono text-xs text-slate-400">ID: {specimen.code}</span>
              </div>
              {/* Categoría / rubro: amarillo vivo para contraste total sobre fondo negro */}
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                {specimen.rubroLabel ??
                  specimen.family ??
                  t('product.category_dried', 'Especímenes secos biológicos')}
              </p>
              <h1 className="text-3xl font-extrabold italic text-white md:text-4xl">
                {specimen.scientificName}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                {t('product.common_name', 'Nombre común')}:{' '}
                <span className="font-medium text-slate-200">
                  {specimen.commonName ?? (isMorpho ? MORPHO_GODARTY_NATIVE.commonName : '—')}
                </span>
              </p>
              {(specimen.description || isMorpho) && (
                <p className="mt-3 text-sm text-slate-300">
                  {specimen.description ?? MORPHO_GODARTY_NATIVE.description}
                </p>
              )}
            </div>

            {/* Selectores de Calidad y Sexo — siempre visibles (Morpho: A.1 / Male ♂) */}
            <div className="relative z-20 grid grid-cols-2 gap-3 overflow-visible">
              <SelectorField
                label={t('product.quality_selector', 'Calidad del Espécimen')}
                accent={accent}
                value={selectedGrade || 'A1'}
                options={gradeOptions}
                onChange={setSelectedGrade}
              />
              <SelectorField
                label={t('product.sex_selector', 'Sexo / Morfología')}
                value={selectedSex || 'M'}
                options={sexOptions}
                onChange={setSelectedSex}
              />
            </div>

            {/* País de origen / expedición: bandera PE + texto (Morpho siempre) */}
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
              {(specimen.regionCode?.toUpperCase() === 'PE' || isMorpho) ? (
                <PeruNationalFlag width={40} className="!h-auto !w-10 !max-w-[2.5rem] shrink-0" />
              ) : specimen.regionCode ? (
                <span
                  className={`fi fi-${specimen.regionCode.toLowerCase()} !block h-auto w-10 max-w-[2.5rem] shrink-0 overflow-hidden rounded-sm aspect-[3/2] ring-1 ring-white/10`}
                  style={{ width: 40, height: 27, backgroundSize: '100% 100%' }}
                  aria-label={specimen.country ?? specimen.regionCode}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  {t('product.origin', 'País de Origen / Expedición')}
                </span>
                <span className="block truncate text-sm font-bold text-white">
                  {specimen.country ?? (isMorpho ? 'Perú' : '—')}
                  <span className="font-normal text-slate-300">
                    {' '}
                    ({specimen.regionName ?? (isMorpho ? MORPHO_GODARTY_NATIVE.regionName : '—')})
                  </span>
                </span>
              </div>
            </div>

            {/* Taxonomía y atributos científicos — campos siempre renderizados */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
              <h3 className="border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {t('product.taxonomy_title', 'Taxonomía y atributos científicos')}
              </h3>
              <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
                <Field label={t('product.order', 'Orden')} value={specimen.order} required={isMorpho} />
                <Field label={t('product.family', 'Familia')} value={specimen.family} required={isMorpho} />
                <Field label={t('product.subfamily', 'Subfamilia')} value={specimen.subfamily} required={isMorpho} />
                <Field label={t('product.genus', 'Género')} value={specimen.genus} required={isMorpho} />
                <Field
                  label={t('product.sex_label', 'Sexo / Tipo')}
                  value={sexDisplay}
                  accent={accent}
                  required={isMorpho}
                />
                <Field
                  label={t('product.grade_label', 'Calidad')}
                  value={specimen.gradeName ?? specimen.grade}
                  required={isMorpho}
                />
                {specimen.wingspanMm != null && (
                  <Field label={t('product.size_label', 'Tamaño')} value={`${specimen.wingspanMm} mm`} />
                )}
                <Field
                  label={t('product.color_label', 'Color')}
                  value={specimen.colors.length > 0 ? specimen.colors.join(', ') : null}
                  required={isMorpho}
                />
                <Field
                  label={t('product.gps', 'Localidad GPS')}
                  value={specimen.gpsCoordinates}
                  required={isMorpho}
                />
              </dl>
            </div>

            {/* Bloque de compra */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/50 p-6 shadow-2xl">
              {showPurchaseTiers && (
                <div className="space-y-3">
                  <h3 className="border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-widest text-white">
                    {t('product.purchase_modality_title', 'Modalidad de Adquisición')}
                  </h3>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-yellow-400">
                    {t('product.purchase_modality_subtitle', 'Venta al Menor y Mayor')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/20 bg-neutral-950 p-1.5">
                    <TierButton on={tier === 'retail'} onClick={() => setTier('retail')}>
                      {t('product.retail_price', 'Venta al Menor (Retail)')}
                    </TierButton>
                    <TierButton on={tier === 'wholesale'} onClick={() => setTier('wholesale')}>
                      {t('product.wholesale_price', 'Venta al Mayor (Lotes)')}
                    </TierButton>
                  </div>
                </div>
              )}

              <CartCurrencySwitcher
                options={currencyOptions}
                value={displayCurrency}
                onChange={setDisplayCurrency}
                t={t}
              />

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="flex items-baseline gap-2">
                    {originalPriceLabel && (
                      <span className="font-mono text-sm text-slate-500 line-through">{originalPriceLabel}</span>
                    )}
                    <span className="text-3xl font-black text-white">{priceLabel}</span>
                  </div>
                  {(discountPercent != null || isMorpho) ? (
                    <span className="block font-mono text-[11px] text-amber-400">
                      {t('product.campaign_savings', 'Ahorro de campaña aplicado')} (-
                      {discountPercent ?? MORPHO_GODARTY_NATIVE.campaignDiscountPercent}%)
                    </span>
                  ) : taxLabel ? (
                    <span className="font-mono text-[11px] text-amber-400">
                      {t('product.tax', 'impuesto')} {taxLabel}
                    </span>
                  ) : null}
                  {wholesaleActive && (
                    <span className="mt-1 block font-mono text-[11px] text-slate-400">
                      {t('product.min_qty', 'Cant. mínima')}: {qty}
                    </span>
                  )}
                </div>
                <span
                  className="rounded border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-xs"
                  style={{ color: specimen.stock > 0 ? '#34d399' : '#f87171' }}
                >
                  {specimen.stock > 0
                    ? `${t('product.stock', 'Stock disponible')} (${specimen.stock})`
                    : t('product.sold_out', 'Agotado')}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={specimen.stock <= 0 || unit == null}
                  onClick={handleAddToCart}
                  className="w-full rounded-xl bg-emerald-500 py-3.5 font-bold text-emerald-950 shadow-lg transition-all hover:bg-emerald-400 disabled:opacity-40"
                >
                  {t('product.add_to_cart', 'Añadir al Carrito / Comprar Ahora')}
                </button>
                <button
                  type="button"
                  onClick={handleBulkInquiry}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10"
                >
                  {t('product.bulk_order', 'Consultar Lotes al Mayor')}
                </button>
              </div>

              {regulatory.vuceNotice && (
                <p className="border-t border-white/10 pt-3 font-mono text-[10px] text-slate-400">
                  {regulatory.vuceNotice}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ActiveImage({
  publicId,
  alt,
  srcOverride = null,
  floating = false,
  chameleon = false,
  accent,
}: {
  publicId: string | null;
  alt: string;
  /** URL directa (p. ej. Morpho WebP/PNG con alfa); gana sobre publicId. */
  srcOverride?: string | null;
  /** Flota sin caja: fondo transparente, object-contain, sin marco. */
  floating?: boolean;
  /** Resplandor camaleónico suave (ficha Morpho dorsal/ventral). */
  chameleon?: boolean;
  accent?: string;
}) {
  const src =
    (srcOverride && srcOverride.trim()) ||
    (publicId ? imageUrl(publicId, ['f_png', 'q_auto:best', 'w_1200', 'c_fit']) : '');

  if (!src) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-slate-600">—</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={
        floating
          ? chameleon
            ? 'morpho-iridescent max-h-[min(480px,70vh)] w-auto max-w-full bg-transparent object-contain object-center transition-all duration-700 ease-out'
            : 'max-h-[min(480px,70vh)] w-auto max-w-full bg-transparent object-contain object-center transition-all duration-700 ease-out'
          : 'max-h-[min(480px,70vh)] w-auto max-w-full bg-transparent object-contain object-center transition-all duration-700'
      }
      style={
        chameleon
          ? ({
              // Accent camaleónico + animación iridiscente (CSS vars)
              ['--morpho-glow' as string]: hexA(accent ?? '#34d399', 0.38),
              ['--morpho-glow-soft' as string]: hexA(accent ?? '#34d399', 0.2),
            } as CSSProperties)
          : floating
            ? { filter: 'none' }
            : undefined
      }
      decoding="async"
      draggable={false}
    />
  );
}

function Field({
  label,
  value,
  accent,
  required = false,
}: {
  label: string;
  value: string | null;
  accent?: string;
  /** Si true, nunca oculta el campo (muestra — ante vacío). */
  required?: boolean;
}) {
  if (!value && !required) return null;
  return (
    <div>
      <span className="block text-[10px] text-slate-500">{label}</span>
      <span className="font-bold" style={accent ? { color: accent } : { color: '#e2e8f0' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function TierButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? 'rounded-lg border border-emerald-400/60 bg-neutral-800 px-2 py-2.5 text-xs font-bold leading-tight text-white shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)] transition-all'
          : 'rounded-lg border border-white/25 bg-neutral-800 px-2 py-2.5 text-xs font-bold leading-tight text-white transition-all hover:border-white/45 hover:bg-neutral-700'
      }
    >
      {children}
    </button>
  );
}

// Campo desplegable (Calidad / Sexo): contraste forzado (texto claro / fondo oscuro).
function SelectorField({
  label,
  accent: _accent,
  value,
  options,
  onChange,
}: {
  label: string;
  accent?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!current) return null;

  return (
    <div ref={box} className="relative flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-neutral-900 px-3 py-2.5 text-left text-xs font-bold text-white transition hover:bg-neutral-800"
      >
        <span className="truncate text-white">{current.label}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-white/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute start-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/15 bg-neutral-900 py-1 shadow-2xl"
        >
          {options.map((opt) => {
            const selected = opt.value === current.value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full px-3 py-2 text-left text-xs font-semibold transition ${
                    selected
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'text-white hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Extrae el calificativo entre paréntesis de un GradeOption.name ("A1
// (Perfecto)" → "Perfecto"); si no hay paréntesis, usa el nombre completo.
function gradeQualifier(name: string): string {
  const m = /\(([^)]+)\)/.exec(name);
  return m ? m[1] : name;
}

// hex (#rgb/#rrggbb) → rgba con alfa; degrada a gris translúcido.
function hexA(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex?.trim() ?? '');
  if (!m) return `rgba(148,163,184,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
