// ============================================================================
// Paleta camaleónica — resuelve un tema desde metadatos dinámicos (rubro,
// taxonomía, perfil) y garantiza contraste accesible.
// ============================================================================

export interface ThemePalette {
  primary: string;
  accent: string;
  surface: string;
  text?: string;
}

export const CSS_VARS = {
  primary: '--color-primary',
  accent: '--color-accent',
  surface: '--color-surface',
  text: '--color-text-dynamic',
} as const;

const DEFAULT_PALETTE: ThemePalette = {
  primary: '#0f766e',
  accent: '#f59e0b',
  surface: '#0b0f0e',
  text: '#f5f5f4',
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isHex(v: unknown): v is string {
  return typeof v === 'string' && HEX.test(v.trim());
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Luminancia relativa (WCAG) para elegir texto legible.
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function readableText(bg: string): string {
  if (!isHex(bg)) return DEFAULT_PALETTE.text!;
  return luminance(toRgb(bg)) > 0.179 ? '#0b0f0e' : '#f5f5f4';
}

// Extrae paleta de un mapa camaleónico de atributos/metadatos.
export function resolvePalette(source?: Record<string, unknown> | null): ThemePalette {
  const s = source ?? {};
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = s[k] ?? (s.theme as Record<string, unknown> | undefined)?.[k];
      if (isHex(v)) return (v as string).trim();
    }
    return undefined;
  };

  const primary = pick('primary', 'color', 'brand', 'primaryColor') ?? DEFAULT_PALETTE.primary;
  const accent = pick('accent', 'secondary', 'accentColor') ?? DEFAULT_PALETTE.accent;
  const surface = pick('surface', 'background', 'bg', 'surfaceColor') ?? DEFAULT_PALETTE.surface;
  const text = pick('text', 'foreground', 'textColor') ?? readableText(surface);

  return { primary, accent, surface, text };
}

// hex (#rgb/#rrggbb) → rgba con alfa; degrada a gris translúcido si el valor
// no es un hex válido. Compartido por cualquier UI que necesite pintar
// resplandores/bordes camaleónicos sobre la paleta resuelta.
export function hexA(hex: string, alpha: number): string {
  if (!isHex(hex)) return `rgba(148,163,184,${alpha})`;
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function paletteToStyle(p: ThemePalette): string {
  return [
    `${CSS_VARS.primary}:${p.primary}`,
    `${CSS_VARS.accent}:${p.accent}`,
    `${CSS_VARS.surface}:${p.surface}`,
    `${CSS_VARS.text}:${p.text ?? readableText(p.surface)}`,
  ].join(';');
}

export { DEFAULT_PALETTE };
