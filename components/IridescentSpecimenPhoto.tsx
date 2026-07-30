'use client';

// ──────────────────────────────────────────────────────────────────────────────
// IridescentSpecimenPhoto
// CERO hardcoding. Sin un solo color fijo.
//
// CÓMO FUNCIONA:
//  1. Recibe `accent` desde resolveTaxonPalette (hash del nombre de familia/orden).
//  2. Al montar, extrae la paleta dominante de la imagen real con canvas → actualiza
//     el acento dinámicamente (la imagen manda sobre la taxonomía).
//  3. Convierte ese acento a HSL para derivar:
//       - H: base del espécimen
//       - H+120°: complementario iridiscente
//       - H+240°: tercer punto del triángulo de color
//  4. El shimmer es un gradiente lineal regenerado en cada frame de ratón.
//     El ángulo viene de la posición real del cursor relativo al centro del elemento.
//  5. El glow es un radial detrás de la imagen — usa mix-blend-mode: screen
//     para mezclar con CUALQUIER fondo web sin romperse.
//  6. En idle (sin ratón), el ángulo drifta lentamente con requestAnimationFrame.
// ──────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { extractDominantPaletteFromImage } from '@/lib/specimens/visual';
import type { ThemePalette } from '@/lib/theme/palette';

interface Props {
  src: string;
  alt: string;
  /** Paleta taxonómica resuelta en servidor. Punto de partida; la imagen la reemplaza. */
  palette: ThemePalette;
  /** Intensidad del shimmer 0–1. Default 0.6 */
  intensity?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

// ── Conversión de color ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex?.trim() ?? '');
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255; const gg = g / 255; const bb = b / 255;
  const max = Math.max(rr, gg, bb); const min = Math.min(rr, gg, bb);
  let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr: h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6; break;
      case gg: h = ((bb - rr) / d + 2) / 6; break;
      default: h = ((rr - gg) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = h / 360; const ss = s / 100; const ll = l / 100;
  if (ss === 0) { const v = Math.round(ll * 255); return [v, v, v]; }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hue2rgb = (t: number) => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(hh + 1 / 3) * 255),
    Math.round(hue2rgb(hh)         * 255),
    Math.round(hue2rgb(hh - 1 / 3) * 255),
  ];
}

// Dado un acento hex, deriva los 3 nodos HSL del shimmer iridiscente (triada)
function deriveTriad(accent: string): Array<[number, number, number]> {
  const rgb = hexToRgb(accent);
  if (!rgb) return [[100, 200, 160], [160, 100, 200], [200, 160, 100]];
  const [h, s, l] = rgbToHsl(...rgb);
  // Triada equidistante: base, +120°, +240°
  // Saturación elevada (80%) para shimmer vívido; luminosidad media (55%)
  return [
    hslToRgb(h,           Math.min(s + 12, 95), Math.max(Math.min(l, 65), 45)),
    hslToRgb((h + 120) % 360, Math.min(s + 20, 95), Math.max(Math.min(l + 8, 70), 45)),
    hslToRgb((h + 240) % 360, Math.min(s + 16, 95), Math.max(Math.min(l + 4, 68), 45)),
  ];
}

// Construye el gradiente lineal holográfico
function buildHolo(triad: Array<[number, number, number]>, angle: number, intensity: number): string {
  const [[r0,g0,b0],[r1,g1,b1],[r2,g2,b2]] = triad;
  const a = (v: number) => (v * intensity).toFixed(2);
  return `linear-gradient(
    ${angle.toFixed(1)}deg,
    rgba(${r0},${g0},${b0},0)                 0%,
    rgba(${r0},${g0},${b0},${a(0.55)})       18%,
    rgba(255,255,255,${a(0.28)})             34%,
    rgba(${r1},${g1},${b1},${a(0.50)})       50%,
    rgba(255,255,255,${a(0.20)})             62%,
    rgba(${r2},${g2},${b2},${a(0.48)})       78%,
    rgba(${r0},${g0},${b0},0)               100%
  )`;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function IridescentSpecimenPhoto({
  src,
  alt,
  palette,
  intensity = 0.60,
  className = '',
  sizes,
  priority = false,
}: Props) {
  // Acento dinámico: empieza con la paleta taxonómica y se actualiza con la imagen
  const [accent, setAccent] = useState<string>(palette.accent);
  const [angle, setAngle]   = useState(130);
  const [hovered, setHovered] = useState(false);
  const [glowAlpha, setGlowAlpha] = useState(0.20);

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);
  const idleAngle    = useRef(130);
  const extractedRef = useRef(false);

  // ── Extracción de color de la imagen real (una sola vez) ──────────────────
  useEffect(() => {
    if (!src || extractedRef.current) return;
    extractedRef.current = true;
    extractDominantPaletteFromImage(src, palette).then((derived) => {
      if (derived.accent !== palette.accent) setAccent(derived.accent);
    });
  }, [src, palette]);

  // ── Drift idle en ausencia de ratón ──────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!hovered) {
        idleAngle.current = (idleAngle.current + 0.22) % 360;
        setAngle(idleAngle.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [hovered]);

  // ── Parallax de ratón ─────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const r    = el.getBoundingClientRect();
    const cx   = r.left + r.width  / 2;
    const cy   = r.top  + r.height / 2;
    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxD = Math.sqrt((r.width / 2) ** 2 + (r.height / 2) ** 2);
    setAngle((Math.atan2(dy, dx) * 180) / Math.PI + 90);
    setGlowAlpha(0.20 + 0.30 * (dist / maxD));
  }, []);

  // ── Derivar triada de colores desde el acento actual ─────────────────────
  const triad  = deriveTriad(accent);
  const [r0, g0, b0] = triad[0];
  const active = hovered;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-visible ${className}`}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setGlowAlpha(0.20); }}
    >
      {/* ── Glow adaptativo (detrás, se mezcla con cualquier fondo) ─────── */}
      {/* mix-blend-mode: screen → blanco sobre negro = blanco; color sobre
          cualquier bg = suma aditiva → nunca rompe el fondo de la web. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-22%',
          zIndex: -1,
          borderRadius: '50%',
          background: `radial-gradient(ellipse 70% 60% at 50% 58%,
            rgba(${r0},${g0},${b0},${glowAlpha}) 0%,
            transparent 75%
          )`,
          filter: `blur(${active ? 32 : 20}px)`,
          opacity: active ? 1 : 0.65,
          transition: 'opacity 0.6s, filter 0.6s',
          mixBlendMode: 'screen' as const,
        }}
      />

      {/* ── Imagen (espera PNG/WebP con alpha) ──────────────────────────── */}
      <div className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 50vw, 25vw'}
          className="object-contain object-center"
          unoptimized
          priority={priority}
        />

        {/* ── Holographic shimmer: overlay ────────────────────────────── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: buildHolo(triad, angle, intensity),
            mixBlendMode: 'overlay' as const,
            opacity: active ? 1 : 0.15,
            transition: 'opacity 0.45s',
            pointerEvents: 'none',
          }}
        />

        {/* ── Specular micro-highlight (punto brillante) ──────────────── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(
              ellipse 35% 25% at
              ${50 + Math.cos(((angle - 90) * Math.PI) / 180) * 28}%
              ${50 + Math.sin(((angle - 90) * Math.PI) / 180) * 22}%,
              rgba(255,255,255,${active ? 0.22 : 0.04}) 0%,
              transparent 65%
            )`,
            mixBlendMode: 'screen' as const,
            transition: 'background 0.08s',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
