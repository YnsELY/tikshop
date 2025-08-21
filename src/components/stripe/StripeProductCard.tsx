import React, { useState } from 'react';
import { ShoppingCart, CreditCard } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StripeProduct } from '../../stripe-config';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';
import { useAuthStore } from '../../store/authStore';
import { AuthModal } from '../auth/AuthModal';
import toast from 'react-hot-toast';

interface StripeProductCardProps {
  product: StripeProduct;
}

export const StripeProductCard: React.FC<StripeProductCardProps> = ({ product }) => {
  const { user } = useAuthStore();
  const { createCheckoutSession, isLoading } = useStripeCheckout();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    console.log('🛒 Starting Stripe product card purchase...');
    console.log('📦 Product:', product.name);
    console.log('💰 Price ID:', product.priceId);

    try {
      const successUrl = `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/products`;

      console.log('🔗 Success URL:', successUrl);
      console.log('🔗 Cancel URL:', cancelUrl);

      await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl,
        cancelUrl,
        metadata: {
          product_id: product.id,
          product_name: product.name,
          source: 'product_card'
        }
      });
      
      console.log('✅ Product card checkout session creation completed');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Erreur lors de l\'achat. Veuillez réessayer.');
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // After successful auth, trigger purchase
    setTimeout(() => {
      handlePurchase();
    }, 500);
  };

  return (
    <>
      <Card className="group overflow-hidden" hover>
        <div className="aspect-square relative overflow-hidden rounded-lg mb-4 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-6xl opacity-20">
            {product.name.includes('Pull') && '🧥'}
            {product.name.includes('Robe') && '👗'}
            {product.name.includes('Chemise') && '👔'}
            {product.name.includes('Jean') && '👖'}
            {product.name.includes('Montre') && '⌚'}
            {product.name.includes('Casque') && '🎧'}
            {product.name.includes('T-shirt') && '👕'}
            {!product.name.match(/(Pull|Robe|Chemise|Jean|Montre|Casque|T-shirt)/) && '🛍️'}
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{product.name}</h3>
            <p className="text-gray-600 text-sm line-clamp-3 mt-2">{product.description}</p>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-2xl font-bold text-[#8b6b5a]">
              €{product.price.toFixed(2)}
            </span>
            <div className="inline-flex items-center bg-orange-100 border border-orange-300 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-xs font-medium text-orange-800">Bientôt épuisé</span>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? (
              'Redirection...'
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Acheter maintenant
              </>
            )}
          </Button>
        </div>
      </Card>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Connexion requise"
        subtitle="Connectez-vous pour effectuer votre achat"
      />
    </>
  );
};