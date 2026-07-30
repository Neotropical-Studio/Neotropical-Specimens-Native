'use client';

// ============================================================================
// Banner universal del carrito: globo + cinta de banderas MUY visibles
// (internacional / confianza) + destino detectado. Camaleónico por rubro.
// ============================================================================
import FlatFlag from '@/src/components/FlatFlag';
import { brandGlobeUrl } from '@/lib/cloudinary/brand';
import { SHIPPING_CONTINENT_LABEL, type ShippingContinent } from '@/lib/shipping/continents';

/** Mercados clave — cinta de banderas (ISO alpha-2). */
export const WORLD_FLAG_CODES = [
  'pe', 'us', 'cn', 'jp', 'kr', 'de', 'fr', 'gb', 'es', 'it', 'br', 'mx',
  'ar', 'cl', 'co', 'ec', 'au', 'nz', 'sg', 'hk', 'tw', 'in', 'ae', 'za',
  'ca', 'nl', 'ch', 'se', 'pt', 'pl',
] as const;

export type CartChameleonTheme = {
  id: string;
  label: string;
  accent: string;
  ring: string;
  glow: string;
  /** Halo suave del globo (sin anillo). */
  globeGlow: string;
};

const RUBRO_THEMES: Record<string, CartChameleonTheme> = {
  'dried-specimens': {
    id: 'dried-specimens',
    label: 'Especímenes secos',
    accent: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    glow: 'from-emerald-900/50 via-black/40 to-teal-900/30',
    globeGlow: 'rgba(52, 211, 153, 0.35)',
  },
  arthropods: {
    id: 'arthropods',
    label: 'Artrópodos',
    accent: 'text-amber-300',
    ring: 'ring-amber-500/30',
    glow: 'from-amber-950/50 via-black/40 to-orange-900/30',
    globeGlow: 'rgba(251, 191, 36, 0.35)',
  },
  'zoology-skeletons': {
    id: 'zoology-skeletons',
    label: 'Esqueletos de zoología',
    accent: 'text-stone-300',
    ring: 'ring-stone-400/30',
    glow: 'from-stone-900/60 via-black/40 to-neutral-800/40',
    globeGlow: 'rgba(214, 211, 209, 0.28)',
  },
  'dry-plants-no-cites': {
    id: 'dry-plants-no-cites',
    label: 'Plantas secas no-CITES',
    accent: 'text-lime-300',
    ring: 'ring-lime-500/30',
    glow: 'from-lime-950/50 via-black/40 to-green-900/30',
    globeGlow: 'rgba(163, 230, 53, 0.32)',
  },
  // Alias legacy
  'dried-plants': {
    id: 'dry-plants-no-cites',
    label: 'Plantas secas no-CITES',
    accent: 'text-lime-300',
    ring: 'ring-lime-500/30',
    glow: 'from-lime-950/50 via-black/40 to-green-900/30',
    globeGlow: 'rgba(163, 230, 53, 0.32)',
  },
  'immersive-3d': {
    id: 'immersive-3d',
    label: 'Inmersivo 3D',
    accent: 'text-cyan-300',
    ring: 'ring-cyan-500/30',
    glow: 'from-cyan-950/50 via-black/40 to-sky-900/30',
    globeGlow: 'rgba(34, 211, 238, 0.35)',
  },
  streaming: {
    id: 'streaming',
    label: 'Streaming / Video',
    accent: 'text-rose-300',
    ring: 'ring-rose-500/30',
    glow: 'from-rose-950/50 via-black/40 to-red-950/30',
    globeGlow: 'rgba(251, 113, 133, 0.32)',
  },
  wholesale: {
    id: 'wholesale',
    label: 'Mayorista',
    accent: 'text-sky-300',
    ring: 'ring-sky-500/30',
    glow: 'from-sky-950/50 via-black/40 to-blue-950/30',
    globeGlow: 'rgba(56, 189, 248, 0.35)',
  },
  default: {
    id: 'default',
    label: 'Checkout universal',
    accent: 'text-teal-300',
    ring: 'ring-teal-500/30',
    glow: 'from-teal-950/50 via-black/40 to-emerald-950/30',
    globeGlow: 'rgba(45, 212, 191, 0.32)',
  },
};

export function themeForRubros(rubroIds: string[]): CartChameleonTheme {
  if (rubroIds.length === 0) return RUBRO_THEMES.default;
  const counts = new Map<string, number>();
  for (const r of rubroIds) counts.set(r, (counts.get(r) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'default';
  return RUBRO_THEMES[top] ?? RUBRO_THEMES.default;
}

interface Props {
  country: string;
  continent: ShippingContinent;
  continentLabel?: string;
  locale: string;
  rubroIds: string[];
  title: string;
  subtitle: string;
}

export default function CartUniverseBanner({
  country,
  continent,
  continentLabel,
  locale,
  rubroIds,
  title,
  subtitle,
}: Props) {
  const theme = themeForRubros(rubroIds);
  // GIF nativo de Tierra girando (no CSS rotateY: una imagen plana desaparece de canto).
  const globeSrc = brandGlobeUrl(['f_gif', 'w_224', 'h_224', 'c_fill', 'g_center']);
  const zone = continentLabel ?? SHIPPING_CONTINENT_LABEL[continent];
  const uniqueRubros = [...new Set(rubroIds)];
  const loopFlags = [...WORLD_FLAG_CODES, ...WORLD_FLAG_CODES];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${theme.glow} ring-1 ${theme.ring}`}
    >
      {/* Cinta de banderas — capa principal, bien visible */}
      <div className="border-b border-white/10 bg-black/55 px-3 py-3 md:px-4 md:py-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
            Mercados globales · envíos seguros
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            +{WORLD_FLAG_CODES.length} países · checkout B2B / B2C
          </p>
        </div>
        <div className="cart-flag-marquee-mask overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-black/80 via-black/40 to-black/80 py-2.5 shadow-inner">
          <div className="cart-flag-marquee flex items-center gap-3 whitespace-nowrap px-2 md:gap-4">
            {loopFlags.map((code, i) => (
              <span
                key={`${code}-${i}`}
                className="cart-flag-chip inline-flex shrink-0 items-center justify-center rounded-md bg-white/95 p-1 shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-white/40"
                title={code.toUpperCase()}
              >
                <FlatFlag countryCode={code} width={42} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-4 p-4 sm:gap-5 sm:p-5 md:p-6">
        <div
          className="cart-globe-stage relative shrink-0"
          style={{ ['--cart-globe-glow' as string]: theme.globeGlow }}
          title="Tierra en rotación horizontal estable"
        >
          {globeSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={globeSrc}
              alt=""
              width={112}
              height={112}
              decoding="async"
              className="cart-globe-live h-16 w-16 sm:h-20 sm:w-20 md:h-28 md:w-28"
            />
          ) : (
            <div
              className="cart-globe-live h-16 w-16 bg-gradient-to-br from-teal-700 to-emerald-900 sm:h-20 sm:w-20 md:h-28 md:w-28"
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`font-mono text-[10px] uppercase tracking-[0.28em] ${theme.accent}`}>
            {subtitle} · {locale.toUpperCase()} · {zone}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-white md:text-2xl">{title}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-400/35 bg-black/55 px-3 py-2 shadow-lg shadow-emerald-950/40">
              <span className="rounded-md bg-white p-0.5 shadow-md ring-1 ring-black/10">
                <FlatFlag countryCode={country} width={48} />
              </span>
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                  Destino detectado
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {country.toUpperCase()} · {zone}
                </span>
              </span>
            </span>

            {uniqueRubros.length > 0 ? (
              uniqueRubros.slice(0, 4).map((r) => {
                const th = RUBRO_THEMES[r] ?? RUBRO_THEMES.default;
                return (
                  <span
                    key={r}
                    className={`rounded-lg border border-white/15 bg-black/45 px-2.5 py-1.5 font-mono text-[10px] ${th.accent}`}
                  >
                    {th.label}
                  </span>
                );
              })
            ) : (
              <span
                className={`rounded-lg border border-white/15 bg-black/45 px-2.5 py-1.5 font-mono text-[10px] ${theme.accent}`}
              >
                {theme.label}
              </span>
            )}
          </div>

          <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-slate-300">
            Comercio internacional con trazabilidad · banderas de mercados reales · pago y
            despacho seguros · i18n local
          </p>
        </div>
      </div>
    </div>
  );
}
