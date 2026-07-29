// ============================================================================
// Identidad visual de Morpho godarty didius tingomarensis (Tingo María).
//
// Solo detecta el ejemplar para presentación (hero/card WebP local).
// Inventario, precios, stock, taxonomía, origen, sexo y calidad salen SIEMPRE
// del catálogo en Supabase.
// ============================================================================

export const MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID =
  'd20ad72d-7957-405a-ada8-53a320009e03';

export const MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_NAME =
  'Morpho godarty didius tingomarensis';

export function isMorphoGodartyDidiusTingomarensis(input: {
  id?: string | null;
  scientificName?: string | null;
  speciesName?: string | null;
}): boolean {
  if (input.id === MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID) return true;
  const hay = `${input.scientificName ?? ''} ${input.speciesName ?? ''}`.toLowerCase();
  return (
    hay.includes('godarty') &&
    hay.includes('didius') &&
    (hay.includes('tingomarensis') || hay.includes('tingo'))
  );
}
