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
  const { createCheckoutSession, createMultiProductCheckoutSession, isLoading: isStripeLoading } = useStripeCheckout();
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
    
    const compatible = items.filter(item => {
      console.log(`🔍 Checking compatibility for: ${item.product.name}`);
      console.log(`📦 Product stripe_price_id: ${item.product.stripe_price_id}`);

      // PRIORITÉ 1: Vérifier si le produit a un stripe_price_id
      if (item.product.stripe_price_id) {
        console.log(`✅ Product has stripe_price_id: ${item.product.stripe_price_id}`);
        return true;
      }

      // PRIORITÉ 2: Vérifier dans les produits Stripe statiques
      const hasStaticMatch = stripeProducts.some(sp => 
        sp.id === item.product.reference || 
        sp.id === item.product.id ||
        sp.name.toLowerCase().trim() === item.product.name.toLowerCase().trim()
      );
      
      if (hasStaticMatch) {
        console.log(`✅ Product found in static Stripe products`);
        return true;
      }
      
      console.log(`❌ Product not compatible with Stripe`);
      return false;
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

    // Protection contre les appels multiples
    if (isProcessing) {
      console.log('⚠️ Payment already processing, ignoring duplicate call');
      return;
    }

    setIsProcessing(true);
    console.log('🔄 Multi-product checkout processing started');

    try {
      console.log('🛒 Starting multi-product Stripe checkout...');
      console.log('📦 Compatible items:', stripeCompatibleItems.length);
      console.log('🚚 Relay point:', relayPoint?.name);
      console.log('📧 Customer email:', formData.email);

      // Créer les line items pour Stripe
      const lineItems = stripeCompatibleItems.map(item => {
        // Vérifier d'abord si le produit a un stripe_price_id (produits synchronisés)
        if (item.product.stripe_price_id) {
          console.log(`✅ Using stripe_price_id for ${item.product.name}: ${item.product.stripe_price_id}`);
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
          console.log(`✅ Using static Stripe product for ${item.product.name}: ${stripeProduct.priceId}`);
          return {
            price: stripeProduct.priceId,
            quantity: item.quantity,
          };
        }
        
        throw new Error(`Produit Stripe non trouvé: ${item.product.name}`);
      });

      console.log('📦 Line items prepared:', lineItems);
      // Préparer les métadonnées pour le webhook
      const metadata = {
        cart_checkout: 'true',
        cart_items: JSON.stringify(stripeCompatibleItems.map(item => ({
          product_id: item.product.id,
          product_reference: item.product.reference,
          variant_id: item.variant?.id || '',
          quantity: item.quantity,
          price: item.product.price, // Ajouter le prix pour le webhook
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

      console.log('📋 Metadata prepared for webhook');

      // Utiliser la nouvelle fonction du hook
      console.log('🚀 Calling createMultiProductCheckoutSession...');
      await createMultiProductCheckoutSession({
        lineItems,
        mode: 'payment',
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
        metadata
      });

      console.log('✅ Checkout session creation completed');

    } catch (error) {
      console.error('❌ Stripe checkout failed:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du paiement Stripe');
    } finally {
      console.log('🔄 Resetting multi-product checkout processing state');
      setIsProcessing(false);
    }
  };

  // Fonction pour créer un nouveau prix actif pour un produit du panier
  const createNewActivePriceForCartItem = async (product: any): Promise<string | null> => {
    try {
      console.log('🚀 Création d\'un nouveau prix actif pour le produit du panier:', product.name);
      
      // 1. Chercher le produit Stripe correspondant
      const searchParams = new URLSearchParams({
        query: `metadata['reference']:'${product.reference}'`,
        limit: '1',
      });
      
      const searchResponse = await fetch(`https://api.stripe.com/v1/products/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
        },
      });
      
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok || searchData.data.length === 0) {
        console.error('❌ Produit Stripe non trouvé pour créer un nouveau prix');
        return null;
      }
      
      const stripeProductId = searchData.data[0].id;
      console.log('✅ Produit Stripe trouvé:', stripeProductId);
      
      // 2. Créer un nouveau prix actif
      const priceAmount = Math.round(product.price * 100); // Convertir en centimes
      
      const priceFormData = new URLSearchParams({
        product: stripeProductId,
        unit_amount: priceAmount.toString(),
        currency: 'eur',
        active: 'true',
        'metadata[reference]': product.reference,
        'metadata[supabase_product_id]': product.id,
        'metadata[created_reason]': 'inactive_price_replacement_cart',
      });
      
      console.log('📤 Création du nouveau prix actif pour le panier...');
      const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceFormData,
      });
      
      const newPriceData = await priceResponse.json();
      
      if (!priceResponse.ok) {
        console.error('❌ Erreur création nouveau prix pour le panier:', newPriceData);
        return null;
      }
      
      console.log('✅ Nouveau prix actif créé pour le panier:', {
        id: newPriceData.id,
        active: newPriceData.active,
        unit_amount: newPriceData.unit_amount
      });
      
      // 3. Mettre à jour la base de données avec le nouveau Price ID
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stripe_price_id: newPriceData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.error('❌ Erreur mise à jour Price ID en base pour le panier:', updateError);
        // Ne pas bloquer le paiement même si la mise à jour échoue
      } else {
        console.log('✅ Nouveau Price ID sauvegardé en base pour le panier:', newPriceData.id);
      }
      
      return newPriceData.id;
    } catch (error) {
      console.error('❌ Erreur lors de la création du nouveau prix actif pour le panier:', error);
      return null;
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

    // Rediriger vers le paiement Stripe
    await handlePlaceOrder();
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
                  type="submit"
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