'use client';

// ============================================================================
// Ficha de producto 100% dinámica y agnóstica. NO contiene datos de espécimen
// ni textos de negocio: recibe el espécimen (Supabase), el mapa de cadenas i18n
// (Sanity + MT, resuelto en servidor), la paleta taxonómica, la divisa/locale
// geo y el aviso regulatorio. Se sincroniza en vivo con la fila del espécimen.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { extractDominantPaletteFromImage } from '@/lib/specimens/visual';
import {
  SPECIMEN_SELECT,
  type SpecimenRow,
} from '@/lib/specimens/view';
import {
  toSpecimenDetail,
  type SpecimenDetailView,
} from '@/lib/specimens/detail';
import { formatMoney, type Regulatory } from '@/lib/geo/regulations';
import { quoteCart, type CartLine, type Profile } from '@/lib/services/cart-adaptive';
import { imageUrl, modelUrl } from '@/lib/cloudinary/url';
import type { ThemePalette } from '@/lib/theme/palette';
import CamaleonicSpecimenViewer from './CamaleonicSpecimenViewer';

interface Props {
  specimen: SpecimenDetailView;
  strings: Record<string, string>;
  lang: string;
  dir: 'ltr' | 'rtl';
  locale: string;
  currency: string;
  palette: ThemePalette;
  regulatory: Regulatory;
}

type MediaKey = '3d' | 'dorsal' | 'ventral' | 'lateral' | 'macro';

export default function SpecimenDetail({
  specimen: initial,
  strings,
  lang,
  dir,
  locale,
  currency,
  palette,
  regulatory,
}: Props) {
  const [specimen, setSpecimen] = useState(initial);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [paletteState, setPaletteState] = useState<ThemePalette>(palette);
  const [recommendations, setRecommendations] = useState<SpecimenDetailView[]>([]);
  const [zoomed, setZoomed] = useState(false);
  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  // --- Media disponible (dinámica: sólo tomas con recurso real) ---------------
  const mediaTabs = useMemo<Array<{ key: MediaKey; label: string }>>(() => {
    const tabs: Array<{ key: MediaKey; label: string }> = [];
    if (specimen.model3d) tabs.push({ key: '3d', label: t('media.view_3d', '3D') });
    (['dorsal', 'ventral', 'lateral', 'macro'] as const).forEach((v) => {
      if (specimen.views[v]) tabs.push({ key: v, label: t(`media.${v}`, v) });
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

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowser();
    const loadRecommendations = async () => {
      const { data } = await supabase
        .from('specimens')
        .select(SPECIMEN_SELECT)
        .eq('is_active', true)
        .limit(6);
      if (alive && data) {
        const mapped = data.map((row) => toSpecimenDetail(row as SpecimenRow, lang)).filter((item) => item.id !== specimen.id);
        setRecommendations(mapped);
      }
    };
    void loadRecommendations();
    return () => {
      alive = false;
    };
  }, [specimen.id, lang]);

  // --- Sincronización en vivo con la fila del espécimen -----------------------
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    try {
      const supabase = getSupabaseBrowser();
      const refresh = async () => {
        const { data } = await supabase
          .from('specimens')
          .select(SPECIMEN_SELECT)
          .eq('id', initial.id)
          .maybeSingle();
        if (alive && data) setSpecimen(toSpecimenDetail(data as SpecimenRow, lang));
      };
      const channel = supabase
        .channel(`specimen-${initial.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'specimens', filter: `id=eq.${initial.id}` }, refresh)
        .subscribe();
      cleanup = () => { supabase.removeChannel(channel); };
    } catch {
      /* Supabase no configurado: la ficha permanece con los datos del servidor. */
    }
    return () => { alive = false; cleanup(); };
  }, [initial.id, lang]);

  // --- Precio adaptativo (impuesto/divisa por perfil geo) ---------------------
  const wholesaleActive = tier === 'wholesale' && specimen.wholesalePrice != null;
  const unit = wholesaleActive ? specimen.wholesalePrice! : specimen.price;
  const qty = wholesaleActive ? specimen.wholesaleMinQty ?? 1 : 1;

  const quote = useMemo(() => {
    if (unit == null) return null;
    const line: CartLine = {
      id: specimen.id,
      sku: specimen.code,
      title: specimen.scientificName,
      quantity: qty,
      unitPrice: Math.round(unit * 100),
      rubro: 'specimens-3d',
    };
    const profile: Profile = {
      country: regulatory.country ?? 'PE',
      segment: wholesaleActive ? 'wholesale' : 'b2c',
    };
    return quoteCart([line], profile);
  }, [unit, qty, wholesaleActive, specimen.id, specimen.code, specimen.scientificName, regulatory.country]);

  const displayCurrency = quote?.currency ?? currency ?? specimen.currency;
  const priceLabel = quote ? formatMoney(quote.total / 100, displayCurrency, locale) : t('product.inquire', 'Inquire');
  const taxLabel = quote && quote.tax > 0 ? formatMoney(quote.tax / 100, displayCurrency, locale) : null;

  const accent = paletteState.accent;
  const primary = paletteState.primary;
  const currentImage = galleryItems[galleryIndex] ?? specimen.primaryImage;

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-screen pb-20 text-slate-100 antialiased"
      style={{ background: `radial-gradient(circle at center, ${hexA(primary, 0.18)} 0%, ${paletteState.surface} 70%)` }}
    >
      {/* Header regulatorio */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href={`/${lang}`} className="font-mono text-xs hover:underline" style={{ color: accent }}>
            {t('nav.back', '← Catalog')}
          </a>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] text-amber-400">
            {t(`regulatory.${regulatory.citesStatus}`, 'Non-CITES · legal commercial specimen')}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Media */}
          <div className="space-y-6 lg:col-span-7">
            <div
              className="relative flex h-[450px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40 md:h-[550px]"
              style={{ boxShadow: `0 0 40px ${hexA(primary, 0.25)}` }}
            >
              {active === '3d' && specimen.model3d ? (
                <CamaleonicSpecimenViewer
                  modelUrl={modelUrl(specimen.model3d)}
                  accent={accent}
                  surface={palette.surface}
                  statusLabel={t('system.render_engine', 'RENDER ENGINE // 3D REAL-TIME')}
                />
              ) : (
                <div className="relative h-full w-full">
                  <ActiveImage
                    publicId={currentImage ?? specimen.views[active as Exclude<MediaKey, '3d'>]}
                    alt={specimen.scientificName}
                  />
                  <button
                    onClick={() => setZoomed((value) => !value)}
                    className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur"
                  >
                    {zoomed ? t('product.zoom_out', 'Zoom out') : t('product.zoom_in', 'Zoom macro')}
                  </button>
                  {zoomed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                      <img
                        src={imageUrl(currentImage ?? specimen.primaryImage ?? '', ['w_1600', 'ar_4:3', 'c_fill'])}
                        alt={specimen.scientificName}
                        className="max-h-full max-w-full rounded-2xl object-contain"
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
                    <img src={imageUrl(item, ['w_120', 'ar_1:1', 'c_fill'])} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}

            {mediaTabs.length > 1 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${mediaTabs.length}, minmax(0,1fr))` }}>
                {mediaTabs.map((m) => {
                  const on = active === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setActive(m.key)}
                      className="rounded-xl border p-2.5 text-center text-xs font-bold uppercase transition-all"
                      style={{
                        borderColor: on ? accent : 'rgba(255,255,255,0.08)',
                        color: on ? accent : '#94a3b8',
                        background: on ? hexA(accent, 0.08) : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6 lg:col-span-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {specimen.grade && (
                  <span
                    className="rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase"
                    style={{ borderColor: hexA(accent, 0.4), background: hexA(accent, 0.1), color: accent }}
                  >
                    {t('product.grade_label', 'Grade')} {specimen.gradeName ?? specimen.grade}
                  </span>
                )}
                <span className="font-mono text-xs text-slate-400">ID: {specimen.code}</span>
              </div>
              <h1 className="text-3xl font-extrabold italic text-white md:text-4xl">{specimen.scientificName}</h1>
              {specimen.commonName && (
                <p className="mt-1 text-xs text-slate-400">
                  {t('product.common_name', 'Common name')}:{' '}
                  <span className="font-medium text-slate-200">{specimen.commonName}</span>
                </p>
              )}
              {specimen.description && <p className="mt-3 text-sm text-slate-300">{specimen.description}</p>}
            </div>

            {/* Origen */}
            {(specimen.country || specimen.regionName) && (
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3.5">
                {specimen.regionCode && (
                  <div className="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded border border-white/10 font-mono text-[10px] font-bold text-white" style={{ background: hexA(primary, 0.4) }}>
                    {specimen.regionCode}
                  </div>
                )}
                <div>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {t('product.origin', 'Origin / Locality')}
                  </span>
                  <span className="text-base font-bold text-white">
                    {[specimen.country, specimen.regionName].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>
            )}

            {/* Taxonomía y atributos (todo desde el dato) */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
              <h3 className="border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {t('product.taxonomy_title', 'Taxonomy & attributes')}
              </h3>
              <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
                <Field label={t('product.order', 'Order')} value={specimen.order} />
                <Field label={t('product.family', 'Family')} value={specimen.family} />
                <Field label={t('product.subfamily', 'Subfamily')} value={specimen.subfamily} />
                <Field label={t('product.genus', 'Genus')} value={specimen.genus} />
                <Field label={t('product.sex_label', 'Sex')} value={specimen.sex} accent={accent} />
                <Field label={t('product.grade_label', 'Grade')} value={specimen.gradeName ?? specimen.grade} />
                {specimen.wingspanMm != null && (
                  <Field label={t('product.size_label', 'Size')} value={`${specimen.wingspanMm} mm`} />
                )}
                {specimen.gpsCoordinates && (
                  <Field label={t('product.gps', 'GPS locality')} value={specimen.gpsCoordinates} />
                )}
              </dl>
            </div>

            {/* Precio adaptativo */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/50 p-6 shadow-2xl">
              {specimen.wholesalePrice != null && (
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/40 p-1">
                  <TierButton on={tier === 'retail'} accent={accent} onClick={() => setTier('retail')}>
                    {t('product.retail_price', 'Retail')}
                  </TierButton>
                  <TierButton on={tier === 'wholesale'} accent={accent} onClick={() => setTier('wholesale')}>
                    {t('product.wholesale_price', 'Wholesale')}
                  </TierButton>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-3xl font-black text-white">{priceLabel}</span>
                  {taxLabel && (
                    <span className="ml-2 font-mono text-[11px] text-amber-400">
                      {t('product.tax', 'tax')} {taxLabel}
                    </span>
                  )}
                  {wholesaleActive && (
                    <span className="mt-1 block font-mono text-[11px] text-slate-400">
                      {t('product.min_qty', 'Min. qty')}: {qty}
                    </span>
                  )}
                </div>
                <span
                  className="rounded border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-xs"
                  style={{ color: specimen.stock > 0 ? accent : '#f87171' }}
                >
                  {specimen.stock > 0
                    ? `${t('product.stock', 'In stock')} (${specimen.stock})`
                    : t('product.sold_out', 'Sold out')}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  disabled={specimen.stock <= 0 || unit == null}
                  className="w-full rounded-xl py-3.5 font-bold text-slate-950 shadow-lg transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  {t('product.add_to_cart', 'Add to cart')}
                </button>
                <button className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10">
                  {t('product.bulk_order', 'Request bulk quote')}
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

        {recommendations.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{t('product.recommendations_title', 'Other species you may like')}</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('product.cross_sell_hint', 'Curated from taxonomy and collection relations')}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {recommendations.slice(0, 3).map((item) => (
                <a key={item.id} href={`/${lang}/product/${item.id}`} className="rounded-2xl border border-white/10 bg-black/40 p-3 transition hover:border-white/20">
                  <img src={imageUrl(item.primaryImage ?? item.secondaryImage ?? '', ['w_480', 'ar_4:3', 'c_fill'])} alt={item.scientificName} className="mb-3 h-40 w-full rounded-xl object-cover" />
                  <p className="text-sm font-semibold text-white">{item.scientificName}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.family ?? item.order}</p>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ActiveImage({ publicId, alt }: { publicId: string | null; alt: string }) {
  if (!publicId) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-slate-600">—</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={imageUrl(publicId, ['w_1200', 'ar_4:3', 'c_fill'])}
      alt={alt}
      className="h-full w-full object-cover transition-all duration-700"
    />
  );
}

function Field({ label, value, accent }: { label: string; value: string | null; accent?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="block text-[10px] text-slate-500">{label}</span>
      <span className="font-bold" style={accent ? { color: accent } : { color: '#e2e8f0' }}>
        {value}
      </span>
    </div>
  );
}

function TierButton({ on, accent, onClick, children }: { on: boolean; accent: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg py-2 text-xs font-bold transition-all"
      style={on ? { backgroundColor: accent, color: '#0b0f0e' } : { color: '#94a3b8' }}
    >
      {children}
    </button>
  );
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
