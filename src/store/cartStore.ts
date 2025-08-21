import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '../types';

interface CartState {
  items: CartItem[];
  timerEndTime: number | null;
  addItem: (product: Product, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  startTimer: () => void;
  clearTimer: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      timerEndTime: null,

      addItem: (product: Product, variant?: ProductVariant) => {
        const items = get().items;
        const existingItem = items.find(item => 
          variant 
            ? item.product.id === product.id && item.variant?.id === variant.id
            : item.product.id === product.id && !item.variant
        );

        console.log('🛒 Adding item to cart:', {
          productName: product.name,
          productId: product.id,
          imageUrl: product.image_url,
          variant: variant ? `${variant.color} - ${variant.size}` : 'none'
        });

        if (existingItem) {
          set({
            items: items.map(item =>
              (variant 
                ? item.product.id === product.id && item.variant?.id === variant.id
                : item.product.id === product.id && !item.variant)
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { 
              id: crypto.randomUUID(), 
              product, 
              variant,
              quantity: 1 
            }],
          });
        }

        // Démarrer le chronomètre si c'est le premier produit ajouté
        const { timerEndTime } = get();
        if (!timerEndTime) {
          get().startTimer();
        }
      },

      removeItem: (productId: string, variantId?: string) => {
        const newItems = get().items.filter(item => 
          variantId 
            ? !(item.product.id === productId && item.variant?.id === variantId)
            : !(item.product.id === productId && !item.variant)
        );
        
        set({ items: newItems });
        
        // Arrêter le chronomètre si le panier devient vide
        if (newItems.length === 0) {
          get().clearTimer();
        }
      },

      updateQuantity: (productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        set({
          items: get().items.map(item =>
            (variantId 
              ? item.product.id === productId && item.variant?.id === variantId
              : item.product.id === productId && !item.variant)
              ? { ...item, quantity }
              : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
        get().clearTimer();
      },

      startTimer: () => {
        const endTime = Date.now() + 10 * 60 * 1000; // 10 minutes en millisecondes
        set({ timerEndTime: endTime });
      },

      clearTimer: () => {
        set({ timerEndTime: null });
      },
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);