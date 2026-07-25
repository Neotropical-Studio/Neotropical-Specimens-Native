// ============================================================================
// Theming camaleónico por taxonomía: deriva la paleta desde orden/familia/
// subfamilia del espécimen. Precedencia:
//   override explícito del espécimen (attributes.theme) → mapa taxonómico → default.
// Reutiliza resolvePalette() para el override y garantiza contraste con readableText().
// ============================================================================
import { resolvePalette, readableText, DEFAULT_PALETTE, type ThemePalette } from './palette';

interface TaxonInput {
  order?: string | null;
  family?: string | null;
  subfamily?: string | null;
  // Override camaleónico opcional traído del dato (Sanity/Supabase attributes.theme).
  override?: Record<string, unknown> | null;
}

// Mapa taxón → paleta. Claves en minúsculas; se casa por subfamilia, luego
// familia, luego orden (de lo más específico a lo más general).
const TAXON_PALETTES: Record<string, ThemePalette> = {
  // Subfamilias / familias específicas
  morphinae: { primary: '#06b6d4', accent: '#22d3ee', surface: '#07131a' }, // cian iridiscente
  saturniidae: { primary: '#8b5cf6', accent: '#a78bfa', surface: '#120b1f' }, // púrpura estructural
  nymphalidae: { primary: '#10b981', accent: '#34d399', surface: '#04140d' }, // esmeralda
  papilionidae: { primary: '#f59e0b', accent: '#fbbf24', surface: '#160f03' },
  // Órdenes (fallback por gran grupo)
  lepidoptera: { primary: '#10b981', accent: '#34d399', surface: '#04140d' }, // esmeralda
  coleoptera: { primary: '#f59e0b', accent: '#fbbf24', surface: '#160f03' },  // ámbar
  hymenoptera: { primary: '#eab308', accent: '#facc15', surface: '#141102' },
  odonata: { primary: '#0ea5e9', accent: '#38bdf8', surface: '#04121a' },
  mantodea: { primary: '#16a34a', accent: '#4ade80', surface: '#04140a' },
  arachnida: { primary: '#b45309', accent: '#d97706', surface: '#160d04' },
};

function norm(v?: string | null): string {
  return (v ?? '').trim().toLowerCase();
}

function complete(p: ThemePalette): ThemePalette {
  return { ...p, text: p.text ?? readableText(p.surface) };
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

  // 2) Mapa taxonómico: subfamilia → familia → orden.
  for (const key of [norm(input.subfamily), norm(input.family), norm(input.order)]) {
    if (key && TAXON_PALETTES[key]) return complete(TAXON_PALETTES[key]);
  }

  // 3) Default global.
  return complete(DEFAULT_PALETTE);
}
