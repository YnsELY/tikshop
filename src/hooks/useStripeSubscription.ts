import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getProductByPriceId } from '../stripe-config';

interface StripeSubscription {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export const useStripeSubscription = () => {
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, using empty subscription data');
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveSubscriptionPlan = () => {
    if (!subscription || !subscription.price_id || subscription.subscription_status !== 'active') {
      return null;
    }

    const product = getProductByPriceId(subscription.price_id);
    return product ? product.name : 'Plan Actif';
  };

  const isSubscriptionActive = () => {
    return subscription?.subscription_status === 'active';
  };

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
    getActiveSubscriptionPlan,
    isSubscriptionActive,
  };
};