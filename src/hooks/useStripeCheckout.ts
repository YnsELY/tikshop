import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getShippingRateId } from '../stripe-config';
import { sessionWatchdog } from '../lib/sessionWatchdog';
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

interface MultiProductCheckoutParams {
  lineItems: Array<{ price: string; quantity: number }>;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  // Fonction centralisée pour obtenir un token d'accès valide
  const getValidAccessToken = async (): Promise<string> => {
    console.log('🔐 Getting valid access token...');
    
    // Récupérer la session actuelle et la rafraîchir si nécessaire
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error('Erreur de session. Veuillez vous reconnecter.');
    }
    
    if (!session?.access_token) {
      console.error('❌ No access token in session');
      // Essayer de rafraîchir la session
      console.log('🔄 Attempting to refresh session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.access_token) {
        console.error('❌ Session refresh failed:', refreshError);
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      console.log('✅ Session refreshed successfully');
      return refreshData.session.access_token;
    }
    
    // Vérifier si le token est expiré
    try {
      const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Rafraîchir si le token expire dans les 5 prochaines minutes
      if (tokenPayload.exp && (tokenPayload.exp - now) < 300) {
        console.log('🔄 Token expired, refreshing...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session?.access_token) {
          console.error('❌ Session refresh failed:', refreshError);
          throw new Error('Impossible de rafraîchir la session. Veuillez vous reconnecter.');
        }
        
        console.log('✅ Session refreshed successfully');
        return refreshData.session.access_token;
      }
    } catch (tokenError) {
      console.warn('⚠️ Could not parse token, proceeding with current session');
    }
    
    console.log('✅ Valid access token obtained');
    return session.access_token;
  };

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

      // Obtenir un token d'accès valide
      const accessToken = await getValidAccessToken();
      
      console.log('📡 Making request to Stripe function...');

      // Déterminer le shipping rate à utiliser
      const shippingRateId = params.shippingRateId || await getShippingRateId(user.id);
      console.log('🚚 Using shipping rate:', shippingRateId === 'shr_1RwnghLvKNaGPjzpHOhrxqlA' ? '6€' : '0€');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      console.log('📡 API URL:', apiUrl);
      console.log('📤 Request payload:', {
        price_id: params.priceId,
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        quantity: params.quantity || 1,
        shipping_rate_id: shippingRateId,
        metadata: params.metadata || {},
      });

      const response = await fetch(apiUrl, {
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
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

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
        } else if (response.status === 500) {
          throw new Error('Erreur serveur Stripe. Veuillez réessayer dans quelques instants.');
        } else if (response.status === 404) {
          throw new Error('Service de paiement non disponible. Contactez le support.');
        } else {
          throw new Error(errorData.error || `Erreur ${response.status}: Impossible de créer la session de paiement`);
        }
      }

      const responseData = await response.json();
      console.log('📥 Response data:', responseData);
      const { url } = responseData;
      
      if (url) {
        console.log('🎯 Redirecting to Stripe...');
        console.log('🔗 Stripe URL:', url);
        toast.success('Redirection vers Stripe...');
        
        // Vérifier que l'URL est valide avant la redirection
        try {
          new URL(url);
          setIsLoading(false);
          
          // Utiliser une redirection plus robuste
          setTimeout(() => {
            window.location.href = url;
          }, 100);
          
          // Ouvrir dans un nouvel onglet au lieu de rediriger
          setTimeout(() => {
            window.open(url, '_blank');
          }, 100);
        } catch (urlError) {
          console.error('❌ Invalid URL received from Stripe:', url);
          throw new Error('URL de paiement invalide reçue');
        }
      } else {
        console.error('❌ No URL in response:', responseData);
        throw new Error('Aucune URL de paiement reçue du serveur');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const createMultiProductCheckoutSession = async (params: MultiProductCheckoutParams) => {
    console.log('📡 createMultiProductCheckoutSession: Starting multi-product checkout...');
    
    if (!user) {
      console.error('❌ createMultiProductCheckoutSession: User not authenticated');
      throw new Error('User must be authenticated');
    }

    if (!params.lineItems || params.lineItems.length === 0) {
      console.error('❌ createMultiProductCheckoutSession: Line items are required');
      throw new Error('Line items are required');
    }

    setIsLoading(true);
    console.log('🔄 createMultiProductCheckoutSession: Loading state set to true');

    try {
      // Obtenir un token d'accès valide
      const accessToken = await getValidAccessToken();
      
      console.log('📡 Making request to multi-product Stripe function...');
      console.log('📦 Line items:', params.lineItems.length);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-multi`;
      
      const requestBody = {
        line_items: params.lineItems,
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {}
      };
      
      console.log('📤 Request body:', requestBody);
      console.log('📡 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Multi-product Stripe function error response:', errorText);
        
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
        } else if (response.status === 500) {
          throw new Error('Erreur serveur Stripe. Veuillez réessayer dans quelques instants.');
        } else if (response.status === 404) {
          throw new Error('Service de paiement non disponible. Contactez le support.');
        } else {
          throw new Error(errorData.error || `Erreur ${response.status}: Impossible de créer la session de paiement`);
        }
      }

      const responseData = await response.json();
      console.log('📥 Multi-product response data:', responseData);
      
      if (responseData.url) {
        console.log('🎯 Redirecting to Stripe checkout...');
        console.log('🔗 Stripe checkout URL:', responseData.url);
        toast.success('Redirection vers le paiement...');
        
        // Vérifier que l'URL est valide avant la redirection
        try {
          new URL(responseData.url);
          setIsLoading(false);
          
          // Utiliser une redirection plus robuste avec délai
          setTimeout(() => {
            window.location.href = responseData.url;
          }, 100);
          
          // Ouvrir dans un nouvel onglet au lieu de rediriger
          setTimeout(() => {
            window.open(responseData.url, '_blank');
          }, 100);
        } catch (urlError) {
          console.error('❌ Invalid checkout URL received:', responseData.url);
          throw new Error('URL de checkout invalide reçue');
        }
      } else {
        console.error('❌ No URL in multi-product response:', responseData);
        throw new Error('Aucune URL de checkout reçue du serveur');
      }
    } catch (error) {
      console.error('❌ Multi-product checkout error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  return {
    createCheckoutSession,
    createMultiProductCheckoutSession,
    isLoading,
  };
};