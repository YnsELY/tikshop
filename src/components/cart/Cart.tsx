import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, Zap } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { CartItem } from './CartItem';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { getShippingPrice } from '../../stripe-config';
import { AuthModal } from '../auth/AuthModal';
import { Card } from '../ui/Card';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [shippingPrice, setShippingPrice] = React.useState<number>(6); // Prix par défaut
  
  const total = getTotalPrice();
  
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

  const handleFinalizeOrder = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Rediriger vers la page checkout
    navigate('/checkout');
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Relancer le checkout après connexion
    setTimeout(() => {
      handleFinalizeOrder();
    }, 500);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Votre panier est vide</h2>
        <p className="text-gray-600 mb-6">Commencez vos achats pour ajouter des produits</p>
        <Link to="/products">
          <Button>Voir les produits</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Panier</h1>
          <Button variant="outline" onClick={clearCart}>
            Vider le panier
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="space-y-0">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold mb-4">Résumé de la commande</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Livraison</span>
                  <span>€{shippingPrice.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>€{(total + shippingPrice).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleFinalizeOrder}
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Finaliser ma commande
                </Button>
                
                <div className="mt-4">
                <Link to="/">
                  <Button variant="outline" className="w-full">
                    Continuer mes achats
                  </Button>
                </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal d'authentification */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Connexion requise"
        subtitle="Connectez-vous pour finaliser votre commande"
      />
    </>
  );
};