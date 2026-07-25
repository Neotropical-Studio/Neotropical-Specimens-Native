// ============================================================================
// Adaptación regulatoria y de divisa por Geo-IP. El sitio comercia especímenes
// no-CITES (comercio legal); este módulo produce el aviso de exportación
// adecuado según el país detectado y formatea importes en la divisa/locale.
// El cálculo de precio/impuesto sigue en lib/services/cart-adaptive.ts.
// ============================================================================

export interface Regulatory {
  country: string | null;
  citesStatus: string;     // clave i18n o texto; el aviso legal base es no-CITES
  exportAllowed: boolean;
  vuceNotice: string | null;   // Perú: Ventanilla Única de Comercio Exterior
  regulator: string | null;
}

// Reglas mínimas y extensibles. Perú (origen de expediciones) expone VUCE/SERFOR;
// el resto recibe un aviso genérico de exportación legal no-CITES.
export function resolveRegulatory(country?: string | null): Regulatory {
  const c = country?.toUpperCase() ?? null;

  if (c === 'PE') {
    return {
      country: c,
      citesStatus: 'non_cites_legal',
      exportAllowed: true,
      vuceNotice: 'Exportación tramitada vía VUCE / SERFOR (Perú).',
      regulator: 'SERFOR',
    };
  }

  return {
    country: c,
    citesStatus: 'non_cites_legal',
    exportAllowed: true,
    vuceNotice: null,
    regulator: null,
  };
}

// Formatea un importe con Intl. `locale` BCP-47, `currency` ISO-4217.
// Degrada con elegancia ante códigos inválidos.
export function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
