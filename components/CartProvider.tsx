'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  CART_STORAGE_KEY,
  cartLineKey,
  type CartItem,
} from '@/lib/cart/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  ready: boolean;
  addItem: (item: Omit<CartItem, 'addedAt'> & { addedAt?: number }) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.id && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStorage(items);
  }, [items, ready]);

  const addItem = useCallback((incoming: Omit<CartItem, 'addedAt'> & { addedAt?: number }) => {
    const next: CartItem = {
      ...incoming,
      quantity: Math.max(1, Math.floor(incoming.quantity || 1)),
      addedAt: incoming.addedAt ?? Date.now(),
    };
    const key = cartLineKey(next);
    setItems((prev) => {
      const idx = prev.findIndex((p) => cartLineKey(p) === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          ...next,
          quantity: copy[idx].quantity + next.quantity,
          addedAt: copy[idx].addedAt,
        };
        return copy;
      }
      return [...prev, next];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const q = Math.floor(quantity);
    setItems((prev) => {
      if (q <= 0) return prev.filter((p) => cartLineKey(p) !== key);
      return prev.map((p) => (cartLineKey(p) === key ? { ...p, quantity: q } : p));
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => cartLineKey(p) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      ready,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, ready, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return { cart: [], addItem: () => {}, removeItem: () => {}, clearCart: () => {} } as any;
  }
  return ctx;
}
