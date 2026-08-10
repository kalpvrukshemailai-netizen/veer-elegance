import { create } from 'zustand';
import type { Product } from '../data/products';

interface CartItem extends Product {
  quantity: number;
}

interface CartStore {
  isOpen: boolean;
  items: CartItem[];
  toggleCart: () => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  isOpen: false,
  items: [],
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  addToCart: (product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id);
      if (existingItem) {
        return {
          isOpen: true,
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { isOpen: true, items: [...state.items, { ...product, quantity: 1 }] };
    });
  },
  removeFromCart: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    }));
  },
  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: quantity === 0 
        ? state.items.filter((item) => item.id !== productId)
        : state.items.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
    }));
  },
  clearCart: () => set({ items: [] }),
  cartTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
