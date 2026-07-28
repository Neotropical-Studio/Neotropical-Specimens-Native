// ============================================================================
// Theming camaleónico por taxonomía/rubro: CERO mapas fijos de nombres
// conocidos. La paleta se deriva algorítmicamente del propio texto real del
// dato (subfamilia → familia → orden, es decir, el "rubro" del espécimen),
// hasheando ese texto a un matiz HSL estable. Así cualquier familia/orden
// nueva que aparezca en Supabase —hoy, mañana, la que sea— se autogenera un
// tono coherente sin tocar una sola línea de código: es regenerativo e
// inteligente, no una tabla de casos hardcodeados.
//
// Precedencia:
//   1) override explícito del dato (Sanity/Supabase attributes.theme) — el
//      dato manda si trae colores propios.
//   2) generación algorítmica desde subfamilia/familia/orden.
//   3) default global sólo si el espécimen no trae taxonomía alguna.
// ============================================================================
import { resolvePalette, readableText, DEFAULT_PALETTE, type ThemePalette } from './palette';

interface TaxonInput {
  order?: string | null;
  family?: string | null;
  subfamily?: string | null;
  // Override camaleónico opcional traído del dato (Sanity/Supabase attributes.theme).
  override?: Record<string, unknown> | null;
}

function norm(v?: string | null): string {
  return (v ?? '').trim().toLowerCase();
}

function complete(p: ThemePalette): ThemePalette {
  return { ...p, text: p.text ?? readableText(p.surface) };
}

// Hash de texto → matiz (0-359). Determinístico: el mismo texto siempre cae
// en el mismo matiz, así el "camaleón" es estable entre renders/sesiones.
function hashHue(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Deriva una paleta completa desde el nombre real del taxón/rubro: mismo
// matiz base para primary/accent/surface (coherencia visual), variando
// saturación y luminosidad — primary vívido, accent más claro para acentos,
// surface muy oscuro con un tinte sutil del mismo tono.
function deriveFromLabel(label: string): ThemePalette {
  const hue = hashHue(label);
  const primary = hslToHex(hue, 68, 46);
  const accent = hslToHex((hue + 18) % 360, 78, 60);
  const surface = hslToHex(hue, 45, 5);
  return { primary, accent, surface, text: readableText(surface) };
}

export function resolveTaxonPalette(input: TaxonInput): ThemePalette {
  // 1) Override explícito del dato (colores hex en attributes.theme/themeConfig).
  if (input.override) {
    const explicit = resolvePalette(input.override);
    // Sólo lo tomamos si difiere del default (es decir, trajo algún hex real).
    if (
      explicit.primary !== DEFAULT_PALETTE.primary ||
      explicit.accent !== DEFAULT_PALETTE.accent ||
      explicit.surface !== DEFAULT_PALETTE.surface
    ) {
      return complete(explicit);
    }
  }

  // 2) Generación algorítmica: subfamilia → familia → orden (de lo más
  // específico a lo más general), sin ningún nombre precargado.
  const key = norm(input.subfamily) || norm(input.family) || norm(input.order);
  if (key) return deriveFromLabel(key);

  // 3) Sin taxonomía resuelta todavía: paleta neutra por defecto.
  return complete(DEFAULT_PALETTE);
}
