// ============================================================================
// Ítems del carrito regenerativo (cliente). Extiende CartLine con metadatos
// de ficha para renderizar y cotizar sin round-trip al servidor.
// ============================================================================
import type { CartLine } from '@/lib/services/cart-adaptive';

export const CART_STORAGE_KEY = 'ns.native.cart.v1';

export interface CartItem extends CartLine {
  /** URL de miniatura (WebP/PNG local o Cloudinary). */
  image?: string | null;
  /** Ruta relativa a la ficha, p. ej. /es/product/<id>. */
  href: string;
  /** Grade / sexo elegidos en la ficha. */
  grade?: string | null;
  sex?: string | null;
  /** Menudeo vs mayoreo al añadir. */
  tier?: 'retail' | 'wholesale';
  currencyHint?: string | null;
  addedAt: number;
}

export function cartLineKey(item: Pick<CartItem, 'id' | 'tier' | 'grade' | 'sex'>): string {
  return [item.id, item.tier ?? 'retail', item.grade ?? '', item.sex ?? ''].join('::');
}

export function toQuoteLines(items: CartItem[]): CartLine[] {
  return items.map(({ id, sku, title, quantity, unitPrice, rubro, attributes }) => ({
    id,
    sku,
    title,
    quantity,
    unitPrice,
    rubro,
    attributes,
  }));
}
