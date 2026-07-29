// ============================================================================
// Perfil nativo EXCLUSIVO de Morpho godarty didius tingomarensis
// (Cuenca Amazónica • Tingo María, Perú).
//
// Fuente de verdad de la ficha moderna para ESTE ejemplar únicamente.
// No se aplica a Morpho peleides ni a ninguna otra especie.
// ============================================================================

export const MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID =
  'd20ad72d-7957-405a-ada8-53a320009e03';

export const MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_NAME =
  'Morpho godarty didius tingomarensis';

/** Localidad GPS nativa (Tingo María / cuenca amazónica). */
export const MORPHO_GODARTY_TINGO_MARIA_GPS = '-9.3000, -76.0028';

export interface MorphoGodartyNativeProfile {
  scientificName: string;
  order: string;
  family: string;
  subfamily: string;
  genus: string;
  regionCode: string;
  country: string;
  /** Texto entre paréntesis junto a Perú en “País de Origen / Expedición”. */
  regionName: string;
  locality: string;
  gpsCoordinates: string;
  /** Código de sexo (SEX_LABEL): M → Male ♂ */
  sex: string;
  /** Código de grado (GRADE_OPTIONS): A1 → A.1 (Perfecto / Museo) */
  grade: string;
  gradeName: string;
  colors: string[];
  commonName: string;
  description: string;
  catalogCode: string;
  price: number;
  currency: string;
  wholesalePrice: number;
  wholesaleMinQty: number;
  stock: number;
  /** Campaña de referencia para la ficha (-15%) si no hay fila en `campaigns`. */
  campaignTitle: string;
  campaignDiscountPercent: number;
}

export const MORPHO_GODARTY_NATIVE: MorphoGodartyNativeProfile = {
  scientificName: MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_NAME,
  order: 'Lepidoptera',
  family: 'Morphidae',
  subfamily: 'Morphinae',
  genus: 'Morpho',
  regionCode: 'PE',
  country: 'Perú',
  regionName: 'Cuenca Amazónica • Tingo María',
  locality: 'Cuenca Amazónica • Tingo María',
  gpsCoordinates: MORPHO_GODARTY_TINGO_MARIA_GPS,
  sex: 'M',
  grade: 'A1',
  gradeName: 'A.1',
  colors: ['Azul Iridiscente'],
  commonName: 'Morpho azul de Tingo María',
  description:
    'Ejemplar de Morpho godarty didius tingomarensis con coloración azul iridiscente, procedente de la Cuenca Amazónica • Tingo María, Perú.',
  catalogCode: 'NEO-MORPHO-TINGO-01',
  price: 260,
  currency: 'USD',
  wholesalePrice: 180,
  wholesaleMinQty: 5,
  stock: 3,
  campaignTitle: 'Campaña Amazónica Tingo María',
  campaignDiscountPercent: 15,
};

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
