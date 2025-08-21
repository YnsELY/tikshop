import React, { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, ProductVariant } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabaseWrapper } from '../lib/supabaseWrapper';
import { useSessionWatchdog } from '../lib/sessionWatchdog';
import { stripeProducts, getProductById } from '../stripe-config';

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  hasInitialized: boolean;
  
  // Actions
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  
  // Async actions
  fetchAllProducts: () => Promise<void>;
  getProductByReference: (reference: string) => Promise<Product | null>;
  createProduct: (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>, variants: Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at'>[]) => Promise<Product>;
  updateProductData: (productId: string, productData: Partial<Product>, variants?: ProductVariant[]) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: [],
      isLoading: false,
      error: null,
      hasInitialized: false,

      setProducts: (products) => set({ products }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      addProduct: (product) => {
        const { products } = get();
        const exists = products.some(p => p.id === product.id);
        if (!exists) {
          console.log('➕ Ajout du produit au store:', product.name);
          set({ products: [...products, product] });
        }
      },
      
      updateProduct: (updatedProduct) => {
        const { products } = get();
        set({
          products: products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
        });
      },
      
      removeProduct: (productId) => {
        const { products } = get();
        set({
          products: products.filter(p => p.id !== productId)
        });
      },

      fetchAllProducts: async () => {
        const { hasInitialized } = get();
        if (hasInitialized) {
          console.log('⚠️ fetchAllProducts: Déjà initialisé, skip');
          return;
        }

        const result = await supabaseWrapper.select<Product>(
        )
        
        try {
          if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, using sample data');
            const { sampleProducts } = await import('../data/sampleProducts');
            set({ products: sampleProducts, isLoading: false, hasInitialized: true });
            return;
          }

          // Utiliser le wrapper avec retry automatique
          const wrapper = new (await import('../lib/supabaseWrapper')).supabaseWrapper.constructor();
          const result = await wrapper.select<Product>(
            'products',
            `
              *,
              variants:product_variants (*)
            `,
            {},
            { operationId: 'fetch-all-products' }
          );

          if (result.error) {
            throw result.error;
          }

          const data = result.data || [];
          console.log('✅ Produits chargés depuis Supabase:', data.length);
          
          data.forEach(product => {
            if (product.stripe_price_id) {
              console.log(`💳 Product "${product.name}" has Stripe price ID: ${product.stripe_price_id} (Price: €${product.price})`);
            } else {
              console.log(`⚠️ Product "${product.name}" (ref: ${product.reference}) has NO Stripe price ID`);
            }
          });
          
          set({ products: data, hasInitialized: true });
        } catch (err) {
          console.error('Error fetching products:', err);
          console.warn('Database error detected, falling back to sample data');
          
          try {
            const { sampleProducts } = await import('../data/sampleProducts');
            set({ 
              products: sampleProducts, 
              hasInitialized: true,
              error: 'Connexion à la base de données impossible. Utilisation des données de démonstration.'
            });
          } catch (fallbackError) {
            console.error('Failed to load sample data:', fallbackError);
            set({ products: [], hasInitialized: true });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      getProductByReference: async (reference: string) => {
        const cleanReference = reference.trim();
        if (!cleanReference) {
          return null;
        }
        
        const { products, addProduct } = get();
        
        const existingProduct = products.find(p => p.reference.toLowerCase() === cleanReference.toLowerCase());
        if (existingProduct) {
          return existingProduct;
        }
        
        set({ isLoading: true });
        
        try {
          if (!isSupabaseConfigured) {
            console.warn('Store: Supabase not configured, searching in fallback data');
            return await searchInFallbackData(cleanReference, addProduct);
          }

          const result = await supabaseWrapper.select<Product>(
            'products',
            `
              *,
              variants:product_variants (*)
            `,
            { reference: cleanReference },
            { operationId: `search-product-${cleanReference}` }
          );

          if (result.error) {
            if (result.error.code === 'PGRST116' || !result.data) {
              return await searchInFallbackData(cleanReference, addProduct);
            }
            
            return await searchInFallbackData(cleanReference, addProduct);
          }

          const product = result.data?.[0];
          if (product) {
            console.log('✅ Store: Produit trouvé dans la base:', product.name);
            addProduct(product);
            return product;
          }
          
          return await searchInFallbackData(cleanReference, addProduct);
          
        } catch (err) {
          console.error('❌ Store: Erreur lors de la recherche Supabase (fallback automatique):', err);
          return await searchInFallbackData(cleanReference, addProduct);
        } finally {
          set({ isLoading: false });
        }
      },

      createProduct: async (productData, variants) => {
        if (!isSupabaseConfigured) {
          throw new Error('Supabase n\'est pas configuré. Veuillez vérifier votre configuration.');
        }
        
        set({ isLoading: true });
        
        try {
          const productResult = await supabaseWrapper.insert<Product>(
            'products',
            productData,
            { operationId: 'create-product' }
          );

          if (productResult.error) {
            throw productResult.error;
          }

          const product = productResult.data;
          if (!product) {
            throw new Error('Product creation returned no data');
          }

          if (variants && variants.length > 0) {
            const variantData = variants.map(variant => ({
              ...variant,
              product_id: product.id,
            }));

            const variantsResult = await supabaseWrapper.insert<ProductVariant>(
              'product_variants',
              variantData,
              { operationId: 'create-variants' }
            );

            if (variantsResult.error) {
              throw variantsResult.error;
            }

            // Récupérer le produit avec ses variantes pour synchroniser l'UI
            const fullProductResult = await supabaseWrapper.select<Product>(
              'products',
              `
                *,
                variants:product_variants (*)
              `,
              { id: product.id },
              { operationId: 'fetch-created-product-with-variants' }
            );

            if (fullProductResult.data?.[0]) {
              const productWithVariants = fullProductResult.data[0];
              const { addProduct } = get();
              addProduct(productWithVariants);
              return productWithVariants;
            }
          }

          const productWithEmptyVariants = { ...product, variants: [] };
          const { addProduct } = get();
          addProduct(productWithEmptyVariants);
          return productWithEmptyVariants;
        } catch (err) {
          console.error('Error creating product:', err);
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      updateProductData: async (productId, productData, variants) => {
        if (!productId) {
          throw new Error('Product ID is required');
        }
        
        set({ isLoading: true });
        
        try {
          // Vérifier que le produit existe
          const existingResult = await supabaseWrapper.select<Product>(
            'products',
            'id, reference, name',
            { id: productId },
            { operationId: 'check-product-exists' }
          );
          
          if (existingResult.error) {
            throw new Error(`Produit non trouvé: ${existingResult.error.message}`);
          }
          
          if (!existingResult.data?.[0]) {
            throw new Error(`Product with ID ${productId} not found`);
          }
          
          // Mettre à jour le produit principal
          const updateResult = await supabaseWrapper.update<Product>(
            'products',
            {
              ...productData,
              updated_at: new Date().toISOString(),
            },
            { id: productId },
            { operationId: `update-product-${productId}` }
          );
          
          if (updateResult.error) {
            throw new Error(`Erreur mise à jour produit: ${updateResult.error.message}`);
          }

          if (!updateResult.data) {
            throw new Error('Aucun produit mis à jour. Vérifiez vos permissions.');
          }
          
          const updatedProduct = updateResult.data;

          // Gérer les variantes si nécessaire
          if (variants && Array.isArray(variants)) {
            // Supprimer les anciennes variantes
            const deleteResult = await supabaseWrapper.delete<ProductVariant>(
              'product_variants',
              { product_id: productId },
              { operationId: `delete-variants-${productId}` }
            );
            
            if (deleteResult.error) {
              throw new Error(`Erreur suppression variantes: ${deleteResult.error.message}`);
            }
            

            if (variants.length > 0) {
              const variantData = variants.map(variant => ({
                color: variant.color,
                size: variant.size,
                stock: variant.stock,
                sku: variant.sku,
                product_id: productId,
              }));

              const variantsResult = await supabaseWrapper.insert<ProductVariant>(
                'product_variants',
                variantData,
                { operationId: `create-new-variants-${productId}` }
              );
              
              if (variantsResult.error) {
                throw new Error(`Erreur création variantes: ${variantsResult.error.message}`);
              }
            }
          }
          
          // Recharger le produit avec ses variantes pour synchroniser l'UI
          const reloadResult = await supabaseWrapper.select<Product>(
            'products',
            `
                *,
                variants:product_variants (*)
            `,
            { id: productId },
            { operationId: `reload-updated-product-${productId}` }
          );
          
          if (reloadResult.error) {
            console.warn('Error reloading product:', reloadResult.error);
          }

          // Mettre à jour le store local avec les données fraîches
          const finalProduct = reloadResult.data?.[0] || {
            ...updatedProduct,
            variants: variants || []
          };
          
          const { updateProduct } = get();
          updateProduct(finalProduct);
          
          // CRITIQUE: Forcer la mise à jour du cache local avec le nouveau stripe_price_id
          console.log('🔄 Forcing local cache update with new stripe_price_id...');
          console.log('🔑 Old stripe_price_id:', get().products.find(p => p.id === productId)?.stripe_price_id);
          console.log('🔑 New stripe_price_id:', finalProduct.stripe_price_id);
          
          // Mettre à jour immédiatement le produit dans le cache local
          set(state => ({
            ...state,
            products: state.products.map(p => 
              p.id === productId 
                ? { ...p, ...finalProduct, stripe_price_id: finalProduct.stripe_price_id }
                : p
            )
          }));
          
          console.log('✅ Local cache updated with new stripe_price_id');
          
          return finalProduct;
          
        } catch (err) {
          console.error('❌ updateProductData failed:', err);

          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteProduct: async (productId) => {
        set({ isLoading: true });
        
        try {
          // Supprimer les variantes d'abord
          await supabaseWrapper.delete<ProductVariant>(
            'product_variants',
            { product_id: productId },
            { operationId: `delete-product-variants-${productId}` }
          );

          // Puis supprimer le produit
          const deleteResult = await supabaseWrapper.delete<Product>(
            'products',
            { id: productId },
            { operationId: `delete-product-${productId}` }
          );

          if (deleteResult.error) {
            throw deleteResult.error;
          }

          const { removeProduct } = get();
          removeProduct(productId);
        } catch (err) {
          console.error('Error deleting product:', err);
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'products-storage',
      partialize: (state) => ({ 
        products: state.products,
        hasInitialized: state.hasInitialized 
      }),
    }
  )
);

// Fonction helper pour la recherche dans les données de fallback
const searchInFallbackData = async (cleanReference: string, addProduct: (product: Product) => void): Promise<Product | null> => {
  try {
    const { sampleProducts } = await import('../data/sampleProducts');
    
    let product = sampleProducts.find(p => p.reference.toLowerCase() === cleanReference.toLowerCase());
    
    if (!product) {
      const stripeProduct = getProductById(cleanReference);
      if (stripeProduct) {
        product = {
          id: stripeProduct.id,
          stripe_price_id: stripeProduct.priceId,
          reference: stripeProduct.id,
          name: stripeProduct.name,
          description: stripeProduct.description,
          price: stripeProduct.price,
          image_url: 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=400',
          category: 'Stripe Product',
          seller_id: 'stripe',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          variants: [],
        };
        addProduct(product);
      }
    } else {
      addProduct(product);
    }
    
    return product;
  } catch (fallbackError) {
    return null;
  }
};

export const useProducts = () => {
  const store = useProductsStore();
  const { isSessionReady } = useSessionWatchdog();
  
  useEffect(() => {
    if (!store.hasInitialized) {
      store.fetchAllProducts();
    }
  }
  )

  return {
    products: store.products,
    isLoading: store.isLoading,
    error: store.error,
    refetch: store.fetchAllProducts,
    getProductByReference: store.getProductByReference,
    createProduct: store.createProduct,
    updateProduct: store.updateProductData,
    deleteProduct: store.deleteProduct,
  };
};