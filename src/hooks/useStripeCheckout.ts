import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getShippingRateId } from '../stripe-config';
import toast from 'react-hot-toast';

interface CheckoutSessionParams {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  quantity?: number;
  shippingRateId?: string;
  metadata?: Record<string, string>;
}

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const createCheckoutSession = async (params: CheckoutSessionParams) => {
    console.log('📡 createCheckoutSession: Starting checkout process...');
    
    if (!user) {
      console.error('❌ createCheckoutSession: User not authenticated');
      throw new Error('User must be authenticated');
    }

    // Validation des paramètres d'entrée
    if (!params.priceId) {
      console.error('❌ createCheckoutSession: priceId is required');
      throw new Error('Price ID is required');
    }
    
    if (!params.successUrl || !params.cancelUrl) {
      console.error('❌ createCheckoutSession: URLs are required');
      throw new Error('Success and cancel URLs are required');
    }

    setIsLoading(true);
    console.log('🔄 createCheckoutSession: Loading state set to true');

    try {
      console.log('🚀 Starting createCheckoutSession...');
      console.log('📋 Params:', {
        priceId: params.priceId,
        mode: params.mode,
        quantity: params.quantity,
        hasMetadata: !!params.metadata
      });

      // Récupérer la session actuelle
      console.log('📡 Getting current session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Session error, trying to refresh...', sessionError);
        
        // Essayer de rafraîchir la session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session?.access_token) {
          console.error('❌ Session refresh failed:', refreshError);
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        console.log('✅ Session refreshed successfully');
        return await makeStripeRequest(params, refreshData.session.access_token);
      }
      
      console.log('✅ Valid session found, making Stripe request...');
      return await makeStripeRequest(params, session.access_token);
      
    } catch (error) {
      console.error('❌ Checkout error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const makeStripeRequest = async (params: CheckoutSessionParams, accessToken: string) => {
    console.log('📡 makeStripeRequest: Starting Stripe request...');
    
    try {
      console.log('📡 Making request to Stripe function...');

      // Déterminer le shipping rate à utiliser
      const shippingRateId = params.shippingRateId || await getShippingRateId(user!.id);
      console.log('🚚 Using shipping rate:', shippingRateId === 'shr_1RwnghLvKNaGPjzpHOhrxqlA' ? '6€' : '0€');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          price_id: params.priceId,
          mode: params.mode,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          quantity: params.quantity || 1,
          shipping_rate_id: shippingRateId,
          metadata: params.metadata || {},
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stripe function error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Messages d'erreur plus spécifiques
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        } else if (response.status === 403) {
          throw new Error('Accès refusé. Vérifiez vos permissions.');
        } else {
          throw new Error(errorData.error || `Erreur ${response.status}: Impossible de créer la session de paiement`);
        }
      }

      const responseData = await response.json();
      const { url } = responseData;
      
      if (url) {
        console.log('🎯 Redirecting to Stripe...');
        toast.success('Redirection vers Stripe...');
        setIsLoading(false);
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('❌ makeStripeRequest error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  return {
    createCheckoutSession,
    isLoading,
  };
};