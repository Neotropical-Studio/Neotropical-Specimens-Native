/**
 * Paginación del catálogo storefront (familias / especies / nodos).
 * Sin hardcode cerrado: se puede cambiar en Vercel con
 *   NEXT_PUBLIC_CATALOGUE_SPECIES_PER_PAGE
 * sin tocar código. Default industrial = 6 (2 filas × 3).
 */

const DEFAULT = 6;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Especímenes por página en el grid de familia / búsqueda. */
export function catalogueSpeciesPerPage(): number {
  return parsePositiveInt(
    process.env.NEXT_PUBLIC_CATALOGUE_SPECIES_PER_PAGE,
    DEFAULT,
  );
}

/**
 * Nodos de navegación (rubros, regiones, categorías, familias) por página.
 * Misma env por defecto; override opcional:
 *   NEXT_PUBLIC_CATALOGUE_NAV_PER_PAGE
 */
export function catalogueNavPerPage(): number {
  return parsePositiveInt(
    process.env.NEXT_PUBLIC_CATALOGUE_NAV_PER_PAGE,
    catalogueSpeciesPerPage(),
  );
}

/** Lista de botones de página: 1 2 3 … N (crece sin tope). */
export function buildCataloguePageList(
  current: number,
  total: number,
): Array<number | '…'> {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.add(i);
  }
  if (current >= total - 3) {
    for (let i = total - 4; i <= total; i++) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push('…');
    out.push(sorted[i]!);
  }
  return out;
}
