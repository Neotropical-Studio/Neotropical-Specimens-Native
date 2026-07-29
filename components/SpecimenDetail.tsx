'use client';

// ============================================================================
// Ficha de producto 100% dinámica y agnóstica. NO contiene datos de espécimen
// ni textos de negocio: recibe el espécimen (Supabase), el mapa de cadenas i18n
// (Sanity + MT, resuelto en servidor), la paleta taxonómica, la divisa/locale
// geo, el aviso regulatorio y la campaña activa (si hay). Se sincroniza en
// vivo con la fila del espécimen.
// ============================================================================
import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import 'flag-icons/css/flag-icons.css';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { extractDominantPaletteFromImage } from '@/lib/specimens/visual';
import { loadCatalogPool, loadCatalogRowById } from '@/lib/specimens/catalog';
import {
  sealMorphoDetailView,
  toSpecimenDetail,
  type SpecimenDetailView,
} from '@/lib/specimens/detail';
import { formatMoney, type Regulatory } from '@/lib/geo/regulations';
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
import { MORPHO_HERO_URL } from '@/lib/cloudinary/specimens';
import CamaleonicSpecimenViewer from './CamaleonicSpecimenViewer';
import PeruNationalFlag from './PeruNationalFlag';

interface Props {
  specimen: SpecimenDetailView;
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
const RECOMMENDATION_POOL_SIZE = 60;
const RECOMMENDATION_COUNT = 8;

const VIEW_LABELS: Record<Exclude<MediaKey, '3d'>, { key: string; fallback: string }> = {
  dorsal: { key: 'media.dorsal', fallback: 'Vista 1: Dorsal' },
  ventral: { key: 'media.ventral', fallback: 'Vista 2: Ventral' },
  lateral: { key: 'media.lateral', fallback: 'Vista 3: Detalle / Antenas' },
  macro: { key: 'media.macro', fallback: 'Vista 4: Macro Escama' },
};

export default function SpecimenDetail({
  specimen: initial,
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
  const [recommendations, setRecommendations] = useState<SpecimenDetailView[]>([]);
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
    const unique = [specimen.views.ventral, specimen.views.dorsal, specimen.views.lateral, specimen.views.macro, specimen.primaryImage]
      .filter((value): value is string => Boolean(value));
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

  // Catálogo dinámico e inteligente: mezcla especímenes de la MISMA familia
  // (otras especies para seguir comprando dentro del mismo grupo) con OTRAS
  // categorías/familias (para que el visitante también pueda saltar a
  // comprar algo completamente distinto). Se trae un pool amplio y se
  // reparte en cliente porque PostgREST no filtra el padre por una columna
  // embebida (taxonomy.family_name) sin un !inner que rompería specímenes
  // sin taxonomía resuelta.
  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowser();
    const loadRecommendations = async () => {
      const poolRows = await loadCatalogPool(supabase, RECOMMENDATION_POOL_SIZE);
      if (!alive) return;

      const pool = poolRows
        .map((row) => toSpecimenDetail(row, lang))
        .filter((item) => item.id !== specimen.id);

      const family = specimen.family?.trim().toLowerCase() || null;
      const sameFamily = family ? pool.filter((item) => item.family?.trim().toLowerCase() === family) : [];
      const otherCategories = family ? pool.filter((item) => item.family?.trim().toLowerCase() !== family) : pool;

      // Hasta la mitad de las tarjetas para "otras especies, misma familia"
      // y el resto para "otras categorías"; si a alguno de los dos grupos
      // le faltan especímenes, el otro rellena los cupos libres.
      const halfQuota = Math.ceil(RECOMMENDATION_COUNT / 2);
      const picked = [...sameFamily.slice(0, halfQuota), ...otherCategories.slice(0, RECOMMENDATION_COUNT - halfQuota)];
      const remainingSlots = RECOMMENDATION_COUNT - picked.length;
      const merged = remainingSlots > 0
        ? [...picked, ...pool.filter((item) => !picked.includes(item)).slice(0, remainingSlots)]
        : picked;

      setRecommendations(merged);
    };
    void loadRecommendations();

    // Cualquier alta/cambio en el catálogo refresca recomendaciones al instante.
    let cleanupChannel = () => {};
    try {
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
      /* sin realtime: el pool inicial sigue válido */
    }

    return () => {
      alive = false;
      cleanupChannel();
    };
  }, [specimen.id, specimen.family, lang, initial.id]);

  // --- Sincronización en vivo con la fila del espécimen + su media ----------
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    try {
      const supabase = getSupabaseBrowser();
      const refresh = async () => {
        const { row } = await loadCatalogRowById(supabase, initial.id);
        if (alive && row) setSpecimen(sealMorphoDetailView(toSpecimenDetail(row, lang)));
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

  const displayCurrency = quote?.currency ?? currency ?? specimen.currency;
  const priceLabel = quote ? formatMoney(quote.total / 100, displayCurrency, locale) : t('product.inquire', 'Consultar precio');
  const originalPriceLabel = originalQuote ? formatMoney(originalQuote.total / 100, displayCurrency, locale) : null;
  const taxLabel = quote && quote.tax > 0 ? formatMoney(quote.tax / 100, displayCurrency, locale) : null;

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

  useEffect(() => {
    setSelectedGrade(specimen.grade ?? (isMorpho ? 'A1' : gradeOptions[0]?.value ?? ''));
  }, [specimen.grade, isMorpho, gradeOptions]);

  useEffect(() => {
    setSelectedSex(specimen.sex ?? (isMorpho ? 'M' : sexOptions[0]?.value ?? ''));
  }, [specimen.sex, isMorpho, sexOptions]);

  const sexDisplay = specimen.sex
    ? t(SEX_LABEL[specimen.sex]?.key ?? 'sex.unknown', SEX_LABEL[specimen.sex]?.fallback ?? specimen.sex)
    : isMorpho
      ? t('sex.male', 'Male ♂')
      : null;

  const showPurchaseTiers = isMorpho || specimen.wholesalePrice != null;
  const campaignTitle = morphoCampaign?.title ?? MORPHO_GODARTY_NATIVE.campaignTitle;

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-screen pb-20 text-slate-100 antialiased"
      style={{ background: `radial-gradient(circle at center, ${hexA(primary, 0.18)} 0%, ${paletteState.surface} 70%)` }}
    >
      {/* Header: volver al escaparate (siempre legible sobre fondo oscuro) */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href={`/${lang}`}
            className="shrink-0 font-mono text-xs text-emerald-300 transition hover:text-emerald-200 hover:underline"
          >
            {t('nav.back', '← Volver al Escaparate Principal')}
          </Link>
          {morphoCampaign && discountPercent != null ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
              + {t('product.campaign_label', 'Campaña')}: {campaignTitle} (-{discountPercent}%)
            </span>
          ) : (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] text-amber-400">
              {t(`regulatory.${regulatory.citesStatus}`, 'No-CITES · espécimen legal para comercio')}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Panel izquierdo: visor de imágenes */}
          <div className="space-y-6 lg:col-span-7">
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
                    srcOverride={isMorpho ? MORPHO_HERO_URL : null}
                    alt={specimen.scientificName}
                    floating
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
                {galleryItems.map((item, index) => (
                  <button
                    key={item}
                    onClick={() => setGalleryIndex(index)}
                    className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(item, ['w_120', 'ar_1:1', 'c_fill'])} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
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
                      onClick={() => setActive(m.key)}
                      className="rounded-xl border p-2.5 text-center transition-all"
                      style={{
                        borderColor: on ? accent : 'rgba(255,255,255,0.08)',
                        background: on ? hexA(accent, 0.08) : 'rgba(255,255,255,0.02)',
                        boxShadow: on ? `0 0 0 1px ${hexA(accent, 0.4)}` : 'none',
                      }}
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
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {t('product.purchase_modality_subtitle', 'Venta al Menor y Mayor')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-neutral-950 p-1.5">
                    <TierButton on={tier === 'retail'} accent={accent} onClick={() => setTier('retail')}>
                      {t('product.retail_price', 'Venta al Menor (Retail)')}
                    </TierButton>
                    <TierButton on={tier === 'wholesale'} accent={accent} onClick={() => setTier('wholesale')}>
                      {t('product.wholesale_price', 'Venta al Mayor (Lotes)')}
                    </TierButton>
                  </div>
                </div>
              )}

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
                  disabled={specimen.stock <= 0 || unit == null}
                  className="w-full rounded-xl bg-emerald-500 py-3.5 font-bold text-emerald-950 shadow-lg transition-all hover:bg-emerald-400 disabled:opacity-40"
                >
                  {t('product.add_to_cart', 'Añadir al Carrito / Comprar Ahora')}
                </button>
                <button className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10">
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

        {/* Catálogo dinámico e inteligente: cambia de espécimen al instante */}
        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <div className="mb-5">
            <span className="block text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
              {t('product.dynamic_catalog_title', 'Catálogo dinámico e inteligente')}
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-white md:text-2xl">
              {t(
                'product.dynamic_catalog_subtitle',
                'Seleccione un espécimen para adaptar el visor, colores y galería en tiempo real',
              )}
            </h2>
          </div>
          {recommendations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.map((item) => {
                const itemAccent = resolveTaxonPalette({
                  order: item.order,
                  family: item.family,
                  subfamily: item.subfamily,
                  override: item.themeOverride,
                }).accent;
                const itemPrice = item.price != null ? formatMoney(item.price, item.currency, locale) : null;
                return (
                  <Link
                    key={item.id}
                    href={`/${lang}/product/${item.id}`}
                    className="group rounded-2xl border border-white/10 bg-black/40 p-3 transition hover:border-white/20"
                  >
                    <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-900">
                      {item.primaryImage || item.secondaryImage ? (
                        <Image
                          src={imageUrl(item.primaryImage ?? item.secondaryImage ?? '', ['w_480', 'ar_4:3', 'c_fill'])}
                          alt={item.scientificName}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-black text-[10px] uppercase tracking-widest text-neutral-600">
                          {t('media.no_image', 'Sin imagen')}
                        </div>
                      )}
                      {(item.family ?? item.order) && (
                        <span
                          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: hexA(itemAccent, 0.85), color: '#050807' }}
                        >
                          {item.family ?? item.order}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold italic text-white">{item.scientificName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {[item.commonName, item.country].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      {itemPrice && (
                        <span className="text-sm font-bold" style={{ color: itemAccent }}>
                          {itemPrice}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition-colors group-hover:text-white">
                        {t('product.activate_viewer', 'Activar Visor')} →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-white">
                {t('product.dynamic_catalog_empty_title', 'Catálogo listo para recepción de inventario')}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {t(
                  'product.dynamic_catalog_empty_subtitle',
                  'Cuando se sincronicen más especímenes de los 4 rubros, aparecerán aquí automáticamente.',
                )}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ActiveImage({
  publicId,
  alt,
  srcOverride = null,
  floating = false,
}: {
  publicId: string | null;
  alt: string;
  /** URL directa (p. ej. Morpho WebP/PNG con alfa); gana sobre publicId. */
  srcOverride?: string | null;
  /** Flota sin caja: fondo transparente, object-contain, sin marco. */
  floating?: boolean;
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
          ? 'max-h-[min(480px,70vh)] w-auto max-w-full bg-transparent object-contain object-center drop-shadow-none transition-all duration-700'
          : 'max-h-[min(480px,70vh)] w-auto max-w-full bg-transparent object-contain object-center transition-all duration-700'
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

function TierButton({ on, accent, onClick, children }: { on: boolean; accent: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2 py-2.5 text-xs font-bold leading-tight transition-all"
      style={
        on
          ? {
              backgroundColor: accent,
              color: '#0b0f0e',
              boxShadow: `0 0 0 1px ${accent}`,
            }
          : {
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.22)',
            }
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
