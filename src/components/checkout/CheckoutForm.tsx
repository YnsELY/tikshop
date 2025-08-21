import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, CreditCard, Zap } from 'lucide-react';
import { MondialRelayWidget } from '../mondialrelay/MondialRelayWidget';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useOrders } from '../../hooks/useOrders';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';
import { stripeProducts, getShippingPrice } from '../../stripe-config';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export const CheckoutForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isStripeMode = searchParams.get('stripe') === 'true';
  const { items, getTotalPrice, clearCart, clearTimer } = useCartStore();
  const { user } = useAuthStore();
  const { createOrder } = useOrders();
  const { createCheckoutSession, isLoading: isStripeLoading } = useStripeCheckout();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingPrice, setShippingPrice] = useState<number>(6); // Prix par défaut

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
  });

  const [relayPoint, setRelayPoint] = useState<any>(null);

  // Calculate Stripe compatibility
  const stripeCompatibleItems = React.useMemo(() => {
    console.log('🔍 Checking Stripe compatibility for cart items...');
    console.log('📦 Cart items:', items.map(item => ({
      name: item.product.name,
      reference: item.product.reference,
      id: item.product.id
    })));
    console.log('🎯 Available Stripe products:', stripeProducts.map(sp => ({
      name: sp.name,
      id: sp.id
    })));
    
    const compatible = items.filter(item => {
      // Essayer plusieurs méthodes de correspondance
      const matchById = stripeProducts.some(sp => sp.id === item.product.id);
      const matchByReference = stripeProducts.some(sp => sp.id === item.product.reference);
      const matchByName = stripeProducts.some(sp => 
        sp.name.toLowerCase().trim() === item.product.name.toLowerCase().trim()
      );
      
      const isCompatible = matchById || matchByReference || matchByName;
      
      console.log(`🔍 Product "${item.product.name}" (ref: ${item.product.reference}, id: ${item.product.id}):`, {
        matchById,
        matchByReference,
        matchByName,
        isCompatible
      });
      
      return isCompatible;
    });
    
    console.log('✅ Stripe compatible items found:', compatible.length, 'out of', items.length);
    return compatible;
  }, [items]);
  
  const hasStripeItems = stripeCompatibleItems.length > 0;
  const allItemsStripeCompatible = stripeCompatibleItems.length === items.length;

  // Calculer le prix de livraison dynamiquement
  React.useEffect(() => {
    const calculateShipping = async () => {
      if (user) {
        try {
          const price = await getShippingPrice(user.id);
          setShippingPrice(price);
        } catch (error) {
          console.error('Error calculating shipping price:', error);
          setShippingPrice(6); // Fallback au prix de première commande
        }
      }
    };
    
    calculateShipping();
  }, [user]);

  // Pré-remplir le formulaire avec les données du profil utilisateur
  React.useEffect(() => {
    if (user?.profile) {
      setFormData({
        first_name: user.profile.first_name || '',
        last_name: user.profile.last_name || '',
        email: user.email || '',
        phone: user.profile.phone || '',
        address: user.profile.address || '',
        city: user.profile.city || '',
        postal_code: user.profile.postal_code || '',
        country: user.profile.country || 'France',
      });
    }
  }, [user]);

  // Détecter si on vient du panier pour un paiement Stripe
  React.useEffect(() => {
    if (isStripeMode && hasStripeItems && user) {
      console.log('🎯 Auto-triggering Stripe checkout from cart redirect');
      // Auto-déclencher le paiement Stripe si on vient du panier
      // Attendre un peu que le composant soit monté
      setTimeout(() => {
        if (formData.first_name && formData.last_name && formData.email) {
          handleMultiProductStripeCheckout();
        }
      }, 1000);
    }
  }, [isStripeMode, hasStripeItems, user, formData.first_name, formData.last_name, formData.email]);

  const total = getTotalPrice();
  const shipping = shippingPrice;
  const finalTotal = total + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultiProductStripeCheckout = async () => {
    console.log('🚀 handleMultiProductStripeCheckout called from CheckoutForm');
    console.log('🔍 User authenticated:', !!user);
    console.log('🔍 Items in cart:', items.length);
    console.log('🔍 Stripe compatible items:', stripeCompatibleItems.length);
    console.log('🔍 Relay point selected:', !!relayPoint);
    console.log('🔍 Form data complete:', !!(formData.first_name && formData.last_name && formData.email));
    
    if (!user) {
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    if (!relayPoint) {
      toast.error('Veuillez sélectionner un point relais');
      return;
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir toutes les informations de livraison');
      return;
    }

    if (stripeCompatibleItems.length === 0) {
      toast.error('Aucun produit compatible avec Stripe dans le panier');
      return;
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      console.log('🔄 Stripe payment processing started');
      return;
    }

    try {
      console.log('🎯 Starting multi-product Stripe checkout...');
      console.log('📦 Stripe compatible items:', stripeCompatibleItems.length);
        
      // Créer les line items pour Stripe
      const lineItems = stripeCompatibleItems.map(item => {
        // Vérifier d'abord si le produit a un stripe_price_id (produits synchronisés)
        if (item.product.stripe_price_id) {
          console.log('✅ Using synced Stripe price ID:', item.product.stripe_price_id);
          return {
            price: item.product.stripe_price_id,
            quantity: item.quantity,
          };
        }
        
        // Sinon, essayer de trouver dans les produits Stripe statiques
        let stripeProduct = stripeProducts.find(sp => sp.id === item.product.id);
        if (!stripeProduct) {
          stripeProduct = stripeProducts.find(sp => sp.id === item.product.reference);
        }
        if (!stripeProduct) {
          stripeProduct = stripeProducts.find(sp => 
            sp.name.toLowerCase().trim() === item.product.name.toLowerCase().trim()
          );
        }
        
        if (stripeProduct) {
          console.log('✅ Found static Stripe product:', stripeProduct.name, 'Price ID:', stripeProduct.priceId);
          return {
            price: stripeProduct.priceId,
            quantity: item.quantity,
          };
        }
        
        console.error('❌ Stripe product not found for:', {
          name: item.product.name,
          reference: item.product.reference,
          id: item.product.id,
          hasStripePriceId: !!item.product.stripe_price_id
        });
        throw new Error(`Produit Stripe non trouvé: ${item.product.name}`);
      });

      console.log('📦 Line items created:', lineItems.length, 'items');
      console.log('📋 Line items details:', lineItems);
      
      // Préparer les métadonnées pour le webhook
      const metadata = {
        cart_checkout: 'true',
        cart_items: JSON.stringify(stripeCompatibleItems.map(item => ({
          product_id: item.product.id,
          product_reference: item.product.reference,
          variant_id: item.variant?.id || '',
          quantity: item.quantity,
        }))),
        total_items: stripeCompatibleItems.length.toString(),
        // Informations de livraison pour le webhook
        shipping_first_name: formData.first_name,
        shipping_last_name: formData.last_name,
        shipping_phone: formData.phone,
        shipping_address: formData.address,
        shipping_city: formData.city,
        shipping_postal_code: formData.postal_code,
        shipping_country: formData.country,
        shipping_email: formData.email,
        // Informations du point relais
        relay_point_id: relayPoint?.id || '',
        relay_point_name: relayPoint?.name || '',
        relay_point_address: relayPoint?.address || '',
        relay_point_city: relayPoint?.city || '',
        relay_point_postal_code: relayPoint?.postalCode || '',
      };

      console.log('📋 Metadata prepared:', metadata);
      
      // Appeler l'edge function multi-produits
      console.log('🔐 Getting authentication session...');
      const { data: { session }, error: tokenError } = await supabase.auth.getSession();
      
      if (tokenError || !session?.access_token) {
        console.error('❌ Authentication error:', tokenError);
        
        // Essayer de rafraîchir la session
        console.log('🔄 Trying to refresh session...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('❌ Session refresh failed:', refreshError);
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        console.log('✅ Session refreshed, retrying...');
      }

      console.log('✅ Valid session found');
      console.log('📡 Calling stripe-checkout-multi function...');
      
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-multi`;
      console.log('🔗 API URL:', apiUrl);
      
      const requestBody = {
        line_items: lineItems,
        mode: 'payment',
        success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: window.location.href,
        metadata: metadata
      };
      
      console.log('📤 Request body:', requestBody);
      
      console.log('📡 Sending request to Stripe function...');
      const currentSession = session || refreshData?.session;
      if (!currentSession?.access_token) {
        throw new Error('Token d\'accès manquant après rafraîchissement');
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stripe checkout error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `Erreur ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError);
        throw new Error('Réponse invalide du serveur');
      }

      console.log('📥 Parsed response data:', responseData);
      
      if (responseData.url) {
        const url = responseData.url;
        console.log('🔗 Stripe checkout URL:', url);
        
        // Rediriger vers Stripe
        console.log('🎯 Redirecting to Stripe checkout...');
        toast.success('Redirection vers le paiement...');
        window.location.href = url;
      } else {
        throw new Error('URL de checkout manquante');
      }
    } catch (error) {
      console.error('❌ Stripe checkout failed:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du paiement Stripe');
    } finally {
      console.log('🔄 Resetting payment processing state');
      setIsProcessing(false);
    }
  };

  const handleClassicOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🛒 handleClassicOrder called');
    console.log('🔍 Current states:', { isProcessing, user: !!user });
    
    // Protection contre les appels multiples
    if (isProcessing) {
      console.log('⚠️ Already processing order, ignoring duplicate call');
      return;
    }
    
    if (!user) {
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    if (!relayPoint) {
      toast.error('Veuillez sélectionner un point relais');
      return;
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir toutes les informations de livraison');
      return;
    }

    setIsProcessing(true);
    console.log('🔄 Classic order processing started');

    try {
      // Créer la commande sans paiement immédiat
      const orderData = {
        user_id: user.id,
        total_amount: finalTotal,
        status: 'pending',
        shipping_address: formData,
        relay_point: relayPoint,
        payment_intent_id: null,
        items: items.map(item => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
          price: item.product.price,
        }))
      };

      await createOrder(orderData);
      
      // Clear cart
      clearCart();
      
      // Arrêter le chronomètre
      clearTimer();
      
      toast.success('Commande créée avec succès !');
      navigate('/orders');
    } catch (error) {
      console.error('Classic order creation failed:', error);
      toast.error('Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      console.log('🔄 Resetting classic order processing state');
      setIsProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    console.log('🛒 handlePlaceOrder called - redirecting to Stripe payment');
    console.log('🔍 Current states:', { isProcessing, user: !!user, relayPoint: !!relayPoint });
    
    // Protection contre les appels multiples
    if (isProcessing) {
      console.log('⚠️ Already processing payment, ignoring duplicate call');
      return;
    }
    
    if (!user) {
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    if (!relayPoint) {
      toast.error('Veuillez sélectionner un point relais');
      return;
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir toutes les informations de livraison');
      return;
    }

    setIsProcessing(true);
    await handleMultiProductStripeCheckout();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    if (!relayPoint) {
      toast.error('Veuillez sélectionner un point relais');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Créer la commande sans paiement immédiat
      const orderData = {
        user_id: user.id,
        total_amount: finalTotal,
        status: 'pending',
        shipping_address: formData,
        relay_point: relayPoint,
        payment_intent_id: null,
        items: items.map(item => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
          price: item.product.price,
        }))
      };

      await createOrder(orderData);
      
      // Clear cart
      clearCart();
      
      // Arrêter le chronomètre
      clearTimer();
      
      toast.success('Commande créée avec succès !');
      navigate('/orders');
    } catch (error) {
      console.error('Order creation failed:', error);
      toast.error('Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600">Add some items to your cart to proceed with checkout</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Shipping Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Point de retrait Mondial Relay
            </h3>
            
            <MondialRelayWidget
              onSelect={setRelayPoint}
              selectedPoint={relayPoint}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-sm">
                    {item.product.name} x{item.quantity}
                    <span className="text-xs text-gray-500 block">REF: {item.product.reference}</span>
                  </span>
                  <span className="text-sm font-medium">
                    €{(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>€{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{relayPoint ? `€${shippingPrice.toFixed(2)}` : 'Sélectionnez un point relais'}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-[#8b6b5a]">€{relayPoint ? finalTotal.toFixed(2) : total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Paiement</h3>
            
            <div className="space-y-4">
              {/* Bouton de paiement Stripe */}
              {hasStripeItems && (
                <Button
                  onClick={handlePlaceOrder}
                  className="w-full bg-[#635bff] hover:bg-[#5a54e6] text-white shadow-lg hover:shadow-xl"
                  disabled={!relayPoint || isProcessing}
                  isLoading={isProcessing}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {isProcessing ? 'Redirection vers le paiement...' : `Paiement sécurisé €${finalTotal.toFixed(2)}`}
                </Button>
              )}
              
              {!hasStripeItems && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Aucun produit compatible avec le paiement en ligne dans votre panier
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
};