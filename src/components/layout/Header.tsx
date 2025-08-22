import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useStripeSubscription } from '../../hooks/useStripeSubscription';
import { Timer } from '../ui/Timer';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { getTotalItems, timerEndTime, clearTimer } = useCartStore();
  const { getActiveSubscriptionPlan } = useStripeSubscription();
  const totalItems = getTotalItems();
  const activePlan = getActiveSubscriptionPlan();

  const handleTimerExpire = () => {
    clearTimer();
  };
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center">
            <img 
              src="https://i.postimg.cc/kMF8n6nR/Design-sans-titre-4.png" 
              alt="Logo" 
              className="w-28 h-16 object-contain"
            />
          </Link>

          {/* Chronomètre au centre */}
          <div className="flex-1 flex justify-center">
            {timerEndTime && (
              <Timer 
                endTime={timerEndTime} 
                onExpire={handleTimerExpire}
              />
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Affichage du plan actif pour les utilisateurs connectés */}
            {user && activePlan && (
              <div className="hidden sm:flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {activePlan}
              </div>
            )}

            {/* Bouton panier - visible seulement si connecté */}
            {user && (
              <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8b6b5a] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <Link to="/profile" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="w-6 h-6 text-gray-700" />
              </Link>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">
                    Inscription
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};