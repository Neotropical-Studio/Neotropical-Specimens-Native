// ============================================================================
// Selección del catálogo dinámico (ficha de producto): prioriza misma familia /
// mismo rubro y rellena con el resto del inventario. Si el catálogo solo tiene
// el espécimen actual, lo mantiene visible para no dejar la sección vacía.
// ============================================================================
import type { SpecimenDetailView } from './detail';

const DEFAULT_COUNT = 8;

export function pickRelatedSpecimens(
  pool: SpecimenDetailView[],
  current: Pick<SpecimenDetailView, 'id' | 'family' | 'rubroId' | 'order'>,
  count: number = DEFAULT_COUNT,
): SpecimenDetailView[] {
  if (pool.length === 0) return [];

  const others = pool.filter((item) => item.id !== current.id);
  // Preferir otros productos; si el inventario es un solo ítem, mostrarlo igual.
  const source = others.length > 0 ? others : pool;

  const family = current.family?.trim().toLowerCase() || null;
  const rubro = current.rubroId ?? null;
  const order = current.order?.trim().toLowerCase() || null;

  const sameFamily = family
    ? source.filter((item) => item.family?.trim().toLowerCase() === family)
    : [];
  const sameRubro = rubro
    ? source.filter(
        (item) =>
          item.rubroId === rubro &&
          !sameFamily.some((s) => s.id === item.id),
      )
    : [];
  const sameOrder = order
    ? source.filter(
        (item) =>
          item.order?.trim().toLowerCase() === order &&
          !sameFamily.some((s) => s.id === item.id) &&
          !sameRubro.some((s) => s.id === item.id),
      )
    : [];
  const rest = source.filter(
    (item) =>
      !sameFamily.some((s) => s.id === item.id) &&
      !sameRubro.some((s) => s.id === item.id) &&
      !sameOrder.some((s) => s.id === item.id),
  );

  const halfQuota = Math.ceil(count / 2);
  const familyQuota = Math.min(halfQuota, sameFamily.length);
  const picked = [
    ...sameFamily.slice(0, familyQuota),
    ...sameRubro.slice(0, Math.max(0, count - familyQuota)),
  ];
  const afterRubro = [
    ...picked,
    ...sameOrder.slice(0, Math.max(0, count - picked.length)),
  ];
  const merged =
    afterRubro.length >= count
      ? afterRubro.slice(0, count)
      : [
          ...afterRubro,
          ...rest.filter((item) => !afterRubro.some((p) => p.id === item.id)).slice(0, count - afterRubro.length),
        ];

  return merged.slice(0, count);
}
