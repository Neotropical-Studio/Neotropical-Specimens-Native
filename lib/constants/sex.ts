// ============================================================================
// Símbolo + clave i18n del sexo/tipo de espécimen. Compartido entre la tarjeta
// de catálogo (SpecimenCard), la ficha de producto (SpecimenDetail) y el panel
// admin (SpecimenForm) para que todos muestren la misma etiqueta ante el mismo
// código guardado en attributes.sex / specimens.sexo.
// ============================================================================

export interface SexOption {
  code: string;
  label: string;
  key: string;
}

/** Opciones del selector de sexo (storefront + admin). */
export const SEX_OPTIONS: SexOption[] = [
  { code: 'M', label: 'Male ♂', key: 'sex.male' },
  { code: 'F', label: 'Female ♀', key: 'sex.female' },
  { code: 'P', label: 'Pareja', key: 'sex.pair' },
  { code: 'EP', label: 'Ex-pupa', key: 'sex.ex_pupa' },
  { code: 'S', label: 'Set', key: 'sex.set' },
];

export const SEX_LABEL: Record<string, { key: string; fallback: string }> =
  Object.fromEntries(SEX_OPTIONS.map((o) => [o.code, { key: o.key, fallback: o.label }]));
