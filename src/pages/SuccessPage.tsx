import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useStripeSubscription } from '../hooks/useStripeSubscription';
import { useOrders } from '../hooks/useOrders';
import { useAuthStore } from '../store/authStore';

export const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const productId = searchParams.get('product_id');
  const quantity = searchParams.get('quantity');
  const { refetch: refetchSubscription } = useStripeSubscription();
  const { orders, refetch: refetchOrders } = useOrders();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [latestOrder, setLatestOrder] = useState<any>(null);

  useEffect(() => {
    // Refresh subscription data after successful payment
    const refreshData = async () => {
      try {
        await refetchSubscription();
        
        // Refresh orders to get the latest order
        if (user) {
          await refetchOrders();
        }
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    if (sessionId) {
      // Wait a bit for webhook to process
      setTimeout(refreshData, 2000);
    } else {
      setIsRefreshing(false);
    }
  }, [sessionId, refetchSubscription]);

  // Find the latest order (most recent one)
  useEffect(() => {
    if (orders && orders.length > 0) {
      // Get the most recent order
      const mostRecentOrder = orders.reduce((latest, current) => {
        return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
      });
      setLatestOrder(mostRecentOrder);
    }
  }, [orders]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-6">
        <Card className="bg-green-50 border-green-200">
          <div className="space-y-4">
            {/* Icône de succès */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            {/* Titre et message */}
            <div>
              <h1 className="text-2xl font-bold text-green-900 mb-2">
                Paiement Réussi !
              </h1>
              <p className="text-green-800">
                Votre commande a été traitée avec succès.
              </p>
            </div>

            {/* Numéro de commande */}
            {latestOrder && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">
                  Numéro de commande :
                </p>
                <p className="font-bold text-lg text-green-800">
                  #{latestOrder.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Commande passée le {new Date(latestOrder.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {/* État de rafraîchissement */}
            {isRefreshing && (
              <div className="flex items-center justify-center space-x-2 text-green-700">
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Mise à jour de votre compte...</span>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/profile">
            <Button className="w-full">
              <Package className="w-4 h-4 mr-2" />
              Voir mon compte
            </Button>
          </Link>
        </div>

        {/* Informations supplémentaires */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Un email de confirmation vous a été envoyé.
          </p>
        </div>
      </div>
    </div>
  );
};