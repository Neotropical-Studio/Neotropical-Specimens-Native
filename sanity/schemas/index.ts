import siteSettings from './siteSettings';
import taxonomicNode from './taxonomicNode';
import uiString from './uiString';
import specimen from './specimen';
import rubro from './taxonomy/rubro';
import familia from './taxonomy/familia';
import subfamilia from './taxonomy/subfamilia';
import genero from './taxonomy/genero';
import especie from './taxonomy/especie';
import subespecie from './taxonomy/subespecie';

export const schemaTypes = [
  siteSettings,
  uiString,
  specimen,
  // Cadena estricta de taxonomía: Rubro → Familia → Subfamilia → Género →
  // Especie → Subespecie (cada nivel referencia únicamente al anterior).
  rubro,
  familia,
  subfamilia,
  genero,
  especie,
  subespecie,
  // Modelo anterior (rank_hierarchy plano) — sigue vivo porque
  // lib/sync/upsertSpecimen.ts todavía mapea specimen.taxon -> taxonomicNode.
  // Pendiente decidir si specimen.taxon migra a `especie`/`subespecie` y este
  // se retira.
  taxonomicNode,
];
