import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ShoppingCart, CreditCard, Minus, Plus, Check, MapPin, Zap } from 'lucide-react';
import { useProducts } from '../../store/productsStore';
import { useOrders } from '../../hooks/useOrders';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';
import { getProductByPriceId, stripeProducts, getShippingPrice } from '../../stripe-config';
import { getColorClass, needsBorder, getContrastTextColor } from '../../utils/colorUtils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { MondialRelayWidget } from '../mondialrelay/MondialRelayWidget';
import { AuthModal } from '../auth/AuthModal';
import { sessionWatchdog } from '../../lib/sessionWatchdog';

interface ProductDetailProps {
  productId?: string;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId: propProductId }) => {
  const { id: paramProductId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = propProductId || paramProductId;
  
  console.log('🔄 ProductDetail render - productId:', productId);
  
  const { products, isLoading: productsLoading } = useProducts();
  const { createOrder } = useOrders();
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { createCheckoutSession, isLoading: isStripeLoading } = useStripeCheckout();
  
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingStripeAction, setPendingStripeAction] = useState<'checkout' | null>(null);
  const [relayPoint, setRelayPoint] = useState<any>(null);
  const [shippingPrice, setShippingPrice] = useState<number>(6); // Prix par défaut
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France'
  });

  const product = products.find(p => p.id === productId);
  
  console.log('🔍 ProductDetail state:', {
    productId,
    productsLoading,
    productsCount: products.length,
    productFound: !!product,
    productName: product?.name
  });
  
  // Trouver le produit Stripe correspondant par référence
  const stripeProduct = React.useMemo(() => {
    if (!product) return null;
    
    console.log('🔍 Checking Stripe compatibility for product:', {
      name: product.name,
      reference: product.reference,
      stripe_price_id: product.stripe_price_id,
      id: product.id
    });
    
     console.log('🔍 DETAILED STRIPE COMPATIBILITY CHECK:');
     console.log('📦 Product from cache:', {
       id: product.id,
       name: product.name,
       reference: product.reference,
       price: product.price,
       stripe_price_id: product.stripe_price_id,
       updated_at: product.updated_at
     });
     
    // 1. PRIORITÉ: Vérifier d'abord si le produit a un stripe_price_id (produits synchronisés)
    if (product.stripe_price_id) {
      console.log('✅ Product has stripe_price_id:', product.stripe_price_id);
       console.log('💰 Using price from stripe_price_id:', product.price);
      return {
        id: product.reference,
        priceId: product.stripe_price_id,
        name: product.name,
        description: product.description,
        mode: 'payment' as const,
        price: parseFloat(product.price.toString())
      };
    }
    
    console.log('⚠️ Product does not have stripe_price_id, checking static products...');
    
    // 2. Correspondance avec les produits Stripe statiques
    let matchedProduct = stripeProducts.find((sp: any) => 
      sp.id === product.reference
    );
    
    // 3. Correspondance par ID de produit (pour les produits créés via admin)
    if (!matchedProduct) {
      matchedProduct = stripeProducts.find((sp: any) => 
        sp.id === product.id
      );
    }
    
    // 4. Correspondance exacte par nom
    if (!matchedProduct) {
      const productNameLower = product.name.toLowerCase().trim();
      
      matchedProduct = stripeProducts.find((sp: any) => {
        const stripeNameLower = sp.name.toLowerCase().trim();
        
        // Correspondance exacte du nom
        if (productNameLower === stripeNameLower) return true;
        
        // Correspondance spéciale pour "Pull" -> "Pull" (produit basique)
        if (productNameLower === 'pull' && sp.id === 'PULL-BASIC') return true;
        
        // Correspondance par prix pour différencier les pulls
        if (productNameLower.includes('pull') && stripeNameLower.includes('pull')) {
          // Si le prix correspond à ±1€ près
          const priceDiff = Math.abs(product.price - sp.price);
          if (priceDiff <= 1) return true;
        }
        
        return false;
      });
    }
    
    console.log('🎯 Final Stripe product match:', matchedProduct ? 'found' : 'not found');
    if (matchedProduct) {
      console.log('📦 Matched product details:', {
        name: matchedProduct.name,
        priceId: matchedProduct.priceId
      });
    }
    
    return matchedProduct || null;
  }, [product]);

  // Calculer le prix de livraison dynamiquement
  useEffect(() => {
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

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        first_name: user.profile?.first_name || '',
        last_name: user.profile?.last_name || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        address: user.profile?.address || '',
        city: user.profile?.city || '',
        postal_code: user.profile?.postal_code || '',
        country: user.profile?.country || 'France'
      }));
    }
  }, [user]);

  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      if (!selectedColor && firstVariant.color) {
        setSelectedColor(firstVariant.color);
      }
      if (!selectedSize && firstVariant.size) {
        setSelectedSize(firstVariant.size);
      }
    }
  }, [product, selectedColor, selectedSize]);

  if (productsLoading) {
    console.log('📦 ProductDetail: Affichage du spinner de chargement');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#8b6b5a]"></div>
          <p className="mt-4 text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    console.log('❌ ProductDetail: Produit non trouvé');
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Produit non trouvé</h2>
        <p className="text-gray-600 mb-4">
          Le produit avec l'ID "{productId}" n'existe pas.
        </p>
        <Button onClick={() => navigate('/products')}>
          Retour aux produits
        </Button>
      </div>
    );
  }

  console.log('✅ ProductDetail: Rendu du produit:', product.name);

  const availableColors = [...new Set(product.variants?.map(v => v.color) || [])];
  const sizesForSelectedColor = product.variants
    ?.filter(v => v.color === selectedColor)
    .map(v => v.size) || [];

  const selectedVariant = product.variants?.find(
    v => v.color === selectedColor && v.size === selectedSize
  );

  const maxStock = selectedVariant?.stock || 0;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    const availableSizes = product.variants
      ?.filter(v => v.color === color)
      .map(v => v.size) || [];
    
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
  };

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Veuillez sélectionner une couleur et une taille');
      return;
    }

    if (selectedVariant.stock === 0) {
      toast.error('Ce produit n\'est plus en stock');
      return;
    }

    // Utiliser la fonction addItem du store avec le produit complet
    addItem(product, selectedVariant);

    toast.success('Produit ajouté au panier !');
  };

  const handleBuyNow = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour passer commande');
      return;
    }

    if (!selectedVariant) {
      toast.error('Veuillez sélectionner une couleur et une taille');
      return;
    }

    if (selectedVariant.stock === 0) {
      toast.error('Ce produit n\'est plus en stock');
      return;
    }

    setShowCheckout(true);
    setTimeout(() => {
      document.getElementById('checkout-form')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleStripeCheckout = async () => {
    console.log('🚀 handleStripeCheckout called');
    
    if (isStripeLoading) {
      console.log('⚠️ Stripe checkout already loading, ignoring duplicate call');
      return;
    }
    
    if (!user) {
      setPendingStripeAction('checkout');
      setShowAuthModal(true);
      return;
    }

    if (!stripeProduct) {
      toast.error('Ce produit n\'est pas disponible pour le paiement Stripe');
      return;
    }

    if (!relayPoint) {
      toast.error('Veuillez sélectionner un point relais avant de payer');
      return;
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir toutes les informations de livraison');
      return;
    }

    console.log('🛒 Starting single product Stripe checkout...');
    console.log('📦 Product:', stripeProduct.name);
    console.log('💰 Price ID:', stripeProduct.priceId);
    console.log('🚚 Relay point:', relayPoint?.name);
    console.log('📧 Customer email:', formData.email);
    try {
      const successUrl = `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = window.location.href;
      
      console.log('🔗 Success URL:', successUrl);
      console.log('🔗 Cancel URL:', cancelUrl);
      
      await createCheckoutSession({
        priceId: stripeProduct.priceId,
        mode: stripeProduct.mode,
        successUrl,
        cancelUrl,
        quantity,
        metadata: {
          product_id: product.id,
          product_reference: product.reference,
          variant_color: selectedVariant.color,
          variant_size: selectedVariant.size,
          variant_id: selectedVariant.id,
          shipping_amount: shippingPrice.toFixed(2),
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
        }
      });
      
      console.log('✅ Single product checkout session creation completed');
    } catch (error) {
      console.error('Stripe checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du paiement Stripe');
    }
  };

  // Fonction pour créer un nouveau prix actif si l'ancien est inactif
  const createNewActivePriceForProduct = async (product: any): Promise<string | null> => {
    try {
      console.log('🚀 Création d\'un nouveau prix actif pour le produit:', product.name);
      
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
        'metadata[created_reason]': 'inactive_price_replacement',
      });
      
      console.log('📤 Création du nouveau prix actif...');
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
        console.error('❌ Erreur création nouveau prix:', newPriceData);
        return null;
      }
      
      console.log('✅ Nouveau prix actif créé:', {
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
        console.error('❌ Erreur mise à jour Price ID en base:', updateError);
        // Ne pas bloquer le paiement même si la mise à jour échoue
      } else {
        console.log('✅ Nouveau Price ID sauvegardé en base:', newPriceData.id);
      }
      
      return newPriceData.id;
    } catch (error) {
      console.error('❌ Erreur lors de la création du nouveau prix actif:', error);
      return null;
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    
    if (pendingStripeAction === 'checkout') {
      setPendingStripeAction(null);
      setTimeout(() => {
        handleStripeCheckout();
      }, 500);
    }
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingStripeAction(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🛒 handlePlaceOrder called');
    console.log('🔍 Current states:', { isProcessing, user: !!user, selectedVariant: !!selectedVariant });
    
    // Protection contre les appels multiples
    if (isProcessing) {
      console.log('⚠️ Already processing order, ignoring duplicate call');
      return;
    }
    
    if (!user || !selectedVariant) {
      toast.error('Informations manquantes pour la commande');
      return;
    }

    if (!relayPoint) {
      toast.error('Veuillez sélectionner un point relais');
      return;
    }

    setIsProcessing(true);
    console.log('🔄 Order processing started');

    try {
      const subtotal = product.price * quantity;
      const shipping = 5.00;
      const total = subtotal + shipping;

      const orderData = {
        user_id: user.id,
        total_amount: total,
        status: 'pending',
        shipping_address: formData,
        relay_point: relayPoint,
        payment_intent_id: null,
        items: [{
          product_id: product.id,
          variant_id: selectedVariant.id,
          quantity: quantity,
          price: product.price,
        }]
      };

      await createOrder(orderData);
      
      toast.success('Commande créée avec succès !');
      clearTimer(); // Arrêter le chronomètre après finalisation
      setShowCheckout(false);
      
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      
      // Gestion d'erreur détaillée
      let errorMessage = 'Erreur lors de la création de la commande';
      if (error instanceof Error) {
        console.error('Order creation error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      console.log('🔄 Resetting order processing state');
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image du produit */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Informations du produit */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-3xl font-bold text-[#8b6b5a]">
                €{product.price.toFixed(2)}
              </span>
              {selectedVariant && (
                <div className="flex items-center space-x-2">
                  {selectedVariant.stock > 0 ? (
                    <div className="inline-flex items-center bg-orange-100 border border-orange-300 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm font-medium text-orange-800">
                        Bientôt épuisé
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center bg-red-100 border border-red-300 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-red-800">
                        Rupture de stock
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sélecteurs de couleur et taille */}
          <div className="space-y-6">
            {/* Sélecteur de couleur avec pastilles améliorées */}
            {availableColors.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">
                  Couleur : <span className="text-primary-600">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const colorClass = getColorClass(color);
                    const isSelected = selectedColor === color;
                    const hasBorder = needsBorder(colorClass);
                    
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className={`group relative flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                          isSelected
                            ? 'border-[#8b6b5a] bg-[#faeede] shadow-lg scale-105'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {/* Pastille de couleur améliorée */}
                        <div className={`w-7 h-7 rounded-full shadow-md ${colorClass} ${
                          hasBorder ? 'ring-2 ring-gray-300' : ''
                        } flex items-center justify-center`}>
                          {/* Indicateur pour les couleurs très claires */}
                          {color.toLowerCase().includes('blanc') || color.toLowerCase().includes('white') ? (
                            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                          ) : null}
                        </div>
                        
                        {/* Nom de la couleur */}
                        <span className={`text-sm font-medium transition-colors ${
                          isSelected ? 'text-[#755441]' : 'text-gray-700'
                        }`}>
                          {color}
                        </span>
                        
                        {/* Indicateur de sélection */}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#8b6b5a] rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sélecteur de taille moderne */}
            {selectedColor && sizesForSelectedColor.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">
                  Taille : <span className="text-primary-600">{selectedSize}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {sizesForSelectedColor.map((size) => {
                    const variant = product.variants?.find(v => v.color === selectedColor && v.size === size);
                    const isOutOfStock = !variant || variant.stock === 0;
                    const isSelected = selectedSize === size;
                    
                    return (
                      <button
                        key={size}
                        onClick={() => handleSizeChange(size)}
                        disabled={isOutOfStock}
                        className={`relative px-4 py-3 rounded-xl border-2 transition-all duration-200 min-w-[60px] ${
                          isSelected
                            ? 'border-[#8b6b5a] bg-[#faeede] text-[#755441] shadow-lg scale-105'
                            : isOutOfStock
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:shadow-md'
                        }`}
                      >
                        <span className="font-semibold">{size}</span>
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-400 transform rotate-45"></div>
                          </div>
                        )}
                        
                        {/* Indicateur de sélection */}
                        {isSelected && !isOutOfStock && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#8b6b5a] rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Sélecteur de quantité moderne */}
            <div className="flex items-center space-x-6">
              <span className="font-semibold text-lg">Quantité :</span>
              <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-50 rounded-l-xl transition-colors border-r border-gray-200"
                >
                  <Minus className="w-5 h-5 text-gray-600" />
                </button>
                <div className="px-6 py-3 min-w-[80px] text-center">
                  <span className="text-lg font-bold text-gray-900">{quantity}</span>
                </div>
                <button
                  onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                  className="p-3 hover:bg-gray-50 rounded-r-xl transition-colors border-l border-gray-200"
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

           <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <Button
                onClick={handleAddToCart}
               variant="outline"
                size="lg"
                disabled={!selectedVariant || selectedVariant.stock === 0}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ajouter au panier
              </Button>
              
              <Button
                onClick={() => navigate('/')}
               className="flex-1 bg-[#8b6b5a] hover:bg-[#755441] text-white"
                size="lg"
              >
                Continuer mes achats
              </Button>
            </div>

            {/* Bouton Acheter maintenant en pleine largeur */}
            <Button
              onClick={handleBuyNow}
              className="w-full"
              size="lg"
              disabled={!selectedVariant || selectedVariant.stock === 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Finaliser mon achat
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire de commande intégré */}
      {showCheckout && (
        <div id="checkout-form" className="mt-8 scroll-mt-8">
          <Card>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CreditCard className="w-6 h-6 mr-2" />
                  Finaliser votre commande
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowCheckout(false)}
                  className="text-gray-500"
                >
                  Annuler
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations de livraison */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Informations de livraison</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Prénom"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      label="Nom"
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
                      label="Téléphone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Widget Mondial Relay */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Point de retrait Mondial Relay
                    </h4>
                    <MondialRelayWidget
                      onSelect={setRelayPoint}
                      selectedPoint={relayPoint}
                    />
                  </div>
                </div>

                {/* Résumé de commande */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Résumé de la commande</h3>
                  
                  <Card padding="sm" className="bg-gray-50">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-500">REF: {product.reference}</p>
                        {selectedVariant && (
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-3 h-3 rounded-full ${getColorClass(selectedVariant.color)}`}></div>
                            <span className="text-sm text-gray-500">
                              {selectedVariant.color} - {selectedVariant.size}
                            </span>
                          </div>
                        )}
                        <p className="text-sm">Quantité: {quantity}</p>
                        {quantity > 1 && (
                          <p className="text-sm text-[#8b6b5a] font-medium mt-1">
                            {quantity} × €{product.price.toFixed(2)} = €{(product.price * quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">€{(product.price * quantity).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Sous-total</span>
                        <span>€{(product.price * quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Livraison</span>
                        <span>€{shippingPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span>€{(product.price * quantity + shippingPrice).toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Boutons de paiement */}
                  <div className="space-y-3">
                    {/* Bouton de paiement sécurisé */}
                    {stripeProduct && (
                      <Button
                        onClick={handleStripeCheckout}
                        className="w-full bg-[#635bff] hover:bg-[#5a54e6] text-white"
                        disabled={!relayPoint || isStripeLoading}
                        isLoading={isStripeLoading}
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        {isStripeLoading ? 'Redirection vers le paiement...' : `Paiement sécurisé €${(product.price * quantity + shippingPrice).toFixed(2)}`}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal d'authentification */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
        title="Connexion requise"
        subtitle="Connectez-vous pour effectuer votre achat"
      />
    </>
  );
};