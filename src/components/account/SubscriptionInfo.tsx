import React from 'react';
import { Crown, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { useStripeSubscription } from '../../hooks/useStripeSubscription';
import { useStripeOrders } from '../../hooks/useStripeOrders';

export const SubscriptionInfo: React.FC = () => {
  const { subscription, isLoading: subLoading, getActiveSubscriptionPlan, isSubscriptionActive } = useStripeSubscription();
  const { orders, isLoading: ordersLoading, formatCurrency } = useStripeOrders();

  if (subLoading || ordersLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  const activePlan = getActiveSubscriptionPlan();
  const hasActiveSubscription = isSubscriptionActive();

  return (
    <div className="space-y-6">
      {/* Informations d'abonnement */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Crown className="w-5 h-5 mr-2 text-yellow-500" />
            Abonnement
          </h3>
          {hasActiveSubscription && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Actif
            </span>
          )}
        </div>

        {hasActiveSubscription && subscription ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Plan actuel</p>
              <p className="font-semibold text-lg">{activePlan}</p>
            </div>

            {subscription.current_period_end && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">
                    {subscription.cancel_at_period_end ? 'Se termine le' : 'Renouvellement le'}
                  </p>
                  <p className="font-medium">
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            )}

            {subscription.payment_method_brand && subscription.payment_method_last4 && (
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Méthode de paiement</p>
                  <p className="font-medium">
                    {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                  </p>
                </div>
              </div>
            )}

            {subscription.cancel_at_period_end && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Abonnement en cours d'annulation
                    </p>
                    <p className="text-sm text-yellow-700">
                      Votre abonnement se terminera le {new Date(subscription.current_period_end! * 1000).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Crown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Aucun abonnement actif</p>
            <p className="text-sm text-gray-500">
              Découvrez nos plans d'abonnement pour accéder à plus de fonctionnalités
            </p>
          </div>
        )}
      </Card>

      {/* Historique des commandes */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Historique des achats</h3>
        
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucun achat effectué</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.order_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    Commande #{order.order_id}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.order_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(order.amount_total, order.currency)}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment_status === 'paid' ? 'Payé' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
            
            {orders.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                Et {orders.length - 5} autre(s) commande(s)...
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};