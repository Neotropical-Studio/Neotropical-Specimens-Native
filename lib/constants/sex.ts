// ============================================================================
// Símbolo + clave i18n del sexo/tipo de espécimen. Compartido entre la tarjeta
// de catálogo (SpecimenCard) y la ficha de producto (SpecimenDetail) para que
// ambos muestren siempre la misma etiqueta ante el mismo código guardado en
// attributes.sex.
// ============================================================================
export const SEX_LABEL: Record<string, { key: string; fallback: string }> = {
  M: { key: 'sex.male', fallback: 'Male ♂' },
  F: { key: 'sex.female', fallback: 'Female ♀' },
  P: { key: 'sex.pair', fallback: 'Pareja' },
  EP: { key: 'sex.ex_pupa', fallback: 'Ex-pupa' },
  S: { key: 'sex.set', fallback: 'Set' },
};
