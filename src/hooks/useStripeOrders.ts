import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface StripeOrder {
  customer_id: string;
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export const useStripeOrders = () => {
  const [orders, setOrders] = useState<StripeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setOrders([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'eur') => {
    const safeCurrency = currency || 'eur';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: safeCurrency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  };

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    formatCurrency,
  };
};