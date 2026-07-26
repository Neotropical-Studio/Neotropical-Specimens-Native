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
  // Obsoleto (ver sanity/schemas/taxonomicNode.ts) — specimen.taxon ya
  // referencia especie/subespecie. Registrado sólo para no dejar inaccesibles
  // documentos preexistentes de este tipo.
  taxonomicNode,
];
