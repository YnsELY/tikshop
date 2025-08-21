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
  shippingQuantity?: number;
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

      // Utiliser le sessionWatchdog pour une gestion robuste de la session
      console.log('🔐 Checking session validity with watchdog...');
      const sessionReady = await sessionWatchdog.waitForSession(15000); // 15 secondes timeout
      
      if (!sessionReady) {
        console.error('❌ Session not ready after timeout');
        setIsLoading(false);
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      // Récupérer la session fraîche après validation
      console.log('📡 Getting fresh session after validation...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Failed to get fresh session:', sessionError);
        setIsLoading(false);
        throw new Error('Impossible de récupérer la session. Veuillez vous reconnecter.');
      }
      
      console.log('✅ Fresh session obtained, making Stripe request...');
      return await makeStripeRequest(params, session.access_token);
      
    } catch (error) {
      console.error('❌ Checkout error:', error);
      console.log('📡 createCheckoutSession: Process failed');
      throw error;
    } finally {
      console.log('🏁 createCheckoutSession: Finally block executed');
      // Note: setIsLoading(false) is handled in makeStripeRequest or catch blocks
      console.log('📡 createCheckoutSession: Process completed');
    }
  };

  const makeStripeRequest = async (params: CheckoutSessionParams, accessToken: string) => {
    console.log('📡 makeStripeRequest: Starting Stripe request...');
    
    if (!accessToken) {
      console.error('❌ makeStripeRequest: accessToken is required');
      setIsLoading(false);
      throw new Error('Access token is required');
    }
    
    try {
      console.log('📡 Making request to Stripe function...');
      console.log('🔑 Token preview:', accessToken.substring(0, 20) + '...');

      // Vérifier que le token n'est pas expiré avant de l'utiliser
      try {
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = tokenPayload.exp;
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresAt <= now) {
          console.error('❌ Token is expired, forcing session refresh...');
          setIsLoading(false);
          throw new Error('Token expiré. Veuillez actualiser la page.');
        }
        
        console.log('✅ Token is valid, expires in:', Math.floor((expiresAt - now) / 60), 'minutes');
      } catch (tokenCheckError) {
        console.warn('⚠️ Could not verify token expiry (non-blocking):', tokenCheckError);
      }

      // Déterminer le shipping rate à utiliser
      console.log('📡 makeStripeRequest: About to get shipping rate...');
      const shippingRateId = await getShippingRateId(user!.id);
      console.log('📬 makeStripeRequest: Shipping rate determined');
      console.log('🚚 Using shipping rate:', shippingRateId === 'shr_1RwnghLvKNaGPjzpHOhrxqlA' ? '6€' : '0€');

      console.log('📡 makeStripeRequest: About to call Stripe function...');
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

      console.log('📬 makeStripeRequest: Stripe function response received');
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stripe function error response:', errorText);
        console.log('🔄 makeStripeRequest: Setting loading to false due to error response');
        setIsLoading(false);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('Stripe checkout error response:', errorData);
        
        // Messages d'erreur plus spécifiques
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        } else if (response.status === 403) {
          throw new Error('Accès refusé. Vérifiez vos permissions.');
        } else {
          throw new Error(errorData.error || `Erreur ${response.status}: Impossible de créer la session de paiement`);
        }
      }

      const responseText = await response.text();
      console.log('📬 makeStripeRequest: Response text received');
      console.log('📥 Raw response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        console.log('🔄 makeStripeRequest: Setting loading to false due to parse error');
        setIsLoading(false);
        throw new Error('Réponse invalide du serveur Stripe');
      }
      
      const { url } = responseData;
      console.log('🔗 Received URL:', url);
      
      if (url) {
        console.log('🎯 Redirecting to Stripe...');
        toast.success('Redirection vers Stripe...');
        console.log('🔄 useStripeCheckout: Setting loading to false before redirect');
        setIsLoading(false);
        window.location.href = url;
      } else {
        console.error('❌ No URL in response:', responseData);
        console.log('🔄 useStripeCheckout: Setting loading to false due to missing URL');
        setIsLoading(false);
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('❌ makeStripeRequest error:', error);
      console.log('🔄 useStripeCheckout: Setting loading to false due to request error');
      setIsLoading(false);
      throw error;
    } finally {
      console.log('🏁 makeStripeRequest: Finally block executed');
      console.log('📡 makeStripeRequest: Process completed');
    }
  };

  return {
    createCheckoutSession,
    isLoading,
  };
};