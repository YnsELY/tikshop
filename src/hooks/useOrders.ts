import { useState, useEffect } from 'react';
import { Order } from '../types';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabaseWrapper } from '../lib/supabaseWrapper';
import { useSessionWatchdog } from '../lib/sessionWatchdog';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { isSessionReady, isOperationPending } = useSessionWatchdog();

  useEffect(() => {
    if (user) {
      // Démarrer immédiatement le chargement, la session sera vérifiée en arrière-plan
      fetchOrders();
      
      if (user.profile?.is_admin) {
        fetchAllOrders();
      }
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, using empty orders list');
      setOrders([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('📡 fetchOrders: Starting orders fetch for user:', user.id);
      
      const result = await supabaseWrapper.select<Order>(
        'orders',
        `
          *,
          order_items (
            *,
            products (*)
          )
        `,
        { user_id: user.id },
        { operationId: 'fetch-personal-orders' }
      );
      
      if (result.error) {
        throw result.error;
      }

      const transformedOrders = result.data?.map(order => ({
        ...order,
        items: order.order_items?.map(item => ({
          ...item,
          product: item.products,
          variant: null,
        })) || [],
      })) || [];

      setOrders(transformedOrders);
    } catch (err) {
      console.error('Error fetching personal orders:', err);
      
      // Si une opération est déjà en cours, on ne fait rien et on laisse l'opération en cours se terminer
      if (err instanceof Error && err.message === 'Operation already in progress') {
        console.log('ℹ️ fetchOrders: Operation already in progress, skipping...');
        return;
      }
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Impossible de se connecter à la base de données. Vérifiez votre configuration Supabase.');
      } else {
        // Ne pas afficher l'erreur "Operation already in progress" à l'utilisateur
        if (!(err instanceof Error && err.message === 'Operation already in progress')) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
      }
      // Set empty orders on error
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    if (!user?.profile?.is_admin) {
      setAllOrders([]);
      return;
    }

    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, using empty orders list');
      setAllOrders([]);
      return;
    }
    
    console.log('📡 fetchAllOrders: Starting admin orders fetch');
    setError(null);

    try {
      const ordersResult = await supabaseWrapper.select<any>(
        'orders',
        `
          *,
          order_items (
            *,
            products (*)
          )
        `,
        {},
        { operationId: 'fetch-all-orders' }
      );
      
      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const ordersData = ordersResult.data;
      
      if (!ordersData || ordersData.length === 0) {
        console.log('ℹ️ fetchAllOrders: No orders found');
        setAllOrders([]);
        return;
      }

      const userIds = [...new Set(ordersData.map(order => order.user_id))];
      
      const profilesResult = await supabaseWrapper.select<any>(
        'profiles',
        'id, first_name, last_name, email',
        {},
        { operationId: 'fetch-profiles-for-orders' }
      );
      
      if (profilesResult.error) {
        console.warn('Error fetching profiles (non-critical):', profilesResult.error);
      }

      const profilesMap = new Map();
      profilesResult.data?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      const transformedOrders = ordersData.map(order => {
        const userProfile = profilesMap.get(order.user_id);
        
        return {
          ...order,
          customer: userProfile ? {
            first_name: userProfile.first_name || '',
            last_name: userProfile.last_name || '',
            email: userProfile.email || order.shipping_address?.email || '',
          } : {
            first_name: order.shipping_address?.first_name || 'Utilisateur',
            last_name: order.shipping_address?.last_name || 'Inconnu',
            email: order.shipping_address?.email || 'email@inconnu.com',
          },
          items: order.order_items?.map(item => ({
            ...item,
            product: item.products,
            variant: null,
          })) || [],
        };
      });

      setAllOrders(transformedOrders);
    } catch (err) {
      console.error('Error in fetchAllOrders:', err);
      
      // Si une opération est déjà en cours, on ne fait rien et on laisse l'opération en cours se terminer
      if (err instanceof Error && err.message === 'Operation already in progress') {
        console.log('ℹ️ fetchAllOrders: Operation already in progress, skipping...');
        return;
      }
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Impossible de se connecter à la base de données. Vérifiez votre configuration Supabase.');
      } else {
        // Ne pas afficher l'erreur "Operation already in progress" à l'utilisateur
        if (!(err instanceof Error && err.message === 'Operation already in progress')) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la récupération des commandes');
        }
      }
      // Set empty orders on error
      setAllOrders([]);
    }
  };

  const createOrder = async (orderData: any) => {
    if (!user) {
      throw new Error('User must be logged in to create an order');
    }

    setIsLoading(true);
    try {
      const orderResult = await supabaseWrapper.insert<Order>(
        'orders',
        {
          user_id: user.id,
          total_amount: orderData.total_amount,
          status: 'pending',
          shipping_address: orderData.shipping_address,
          relay_point: orderData.relay_point,
          payment_intent_id: orderData.payment_intent_id,
        },
        { operationId: 'create-order' }
      );

      if (orderResult.error) {
        throw orderResult.error;
      }

      const order = orderResult.data;

      if (orderData.items && orderData.items.length > 0) {
        const orderItems = orderData.items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }));

        const itemsResult = await supabaseWrapper.insert<any>(
          'order_items',
          orderItems,
          { operationId: 'create-order-items' }
        );

        if (itemsResult.error) {
          throw itemsResult.error;
        }
      }

      // Rafraîchir les listes de manière séquencée
      const refreshOperations = [
        { id: 'refresh-personal-orders', operation: fetchOrders },
      ];
      
      if (user.profile?.is_admin) {
        refreshOperations.push({ id: 'refresh-all-orders', operation: fetchAllOrders });
      }
      
      await supabaseWrapper.sequencedRefetch(refreshOperations);

      return order;
    } catch (err) {
      console.error('Error creating order:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    if (!user?.profile?.is_admin) {
      throw new Error('Only admins can update order status');
    }

    setIsLoading(true);
    try {
      const result = await supabaseWrapper.update<Order>(
        'orders',
        { 
          status,
          updated_at: new Date().toISOString()
        },
        { id: orderId },
        { operationId: `update-order-status-${orderId}` }
      );
      
      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error('Order not found or you do not have permission to update it');
      }

      const updatedOrder = result.data;

      // Mettre à jour l'état local immédiatement (synchronisation UI)
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: status as any, updated_at: updatedOrder.updated_at }
            : order
        )
      );

      setAllOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: status as any, updated_at: updatedOrder.updated_at }
            : order
        )
      );

      return updatedOrder;
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Pour les utilisateurs normaux : leurs commandes personnelles
    // Pour les admins : leurs commandes personnelles aussi
    orders,
    
    // Pour les admins : TOUTES les commandes de la plateforme
    // Pour les utilisateurs normaux : tableau vide
    allOrders,
    
    isLoading,
    error,
    refetch: fetchOrders,
    refetchAll: fetchAllOrders,
    createOrder,
    updateOrderStatus,
  };
}