/** Evento browser: familias del catálogo cambiaron (admin ↔ dropdown CARD/VIDEO). */
export const NEO_FAMILIES_CHANGED = 'neo:catalogue-families-changed';

export function notifyCatalogueFamiliesChanged(detail?: {
  regionId?: string;
  categoryId?: string;
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(NEO_FAMILIES_CHANGED, { detail: detail ?? {} }),
  );
}
