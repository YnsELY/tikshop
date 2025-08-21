import React from 'react';
import { Package, Clock, Truck, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { useOrders } from '../../hooks/useOrders';
import { Order } from '../../types';

const statusIcons = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: CheckCircle,
};

const statusColors = {
  pending: 'text-yellow-500',
  processing: 'text-blue-500',
  shipped: 'text-purple-500',
  delivered: 'text-green-500',
  cancelled: 'text-red-500',
};

const statusLabels = {
  pending: 'En attente d\'expédition',
  processing: 'En cours',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const OrderHistory: React.FC = () => {
  const { orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucune commande</h2>
        <p className="text-gray-600">Votre historique de commandes apparaîtra ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: Order) => {
        const StatusIcon = statusIcons[order.status];
        const statusColor = statusColors[order.status];
        const statusLabel = statusLabels[order.status];
        
        return (
          <Card key={order.id} hover>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Commande #{order.id.slice(-8)}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                <span className={`font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Qté: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">
                    €{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Livraison : {order.relay_point?.name || 'Point relais'}
                  </p>
                  {order.relay_point?.address && (
                    <p className="text-xs text-gray-500">
                      {order.relay_point.address}, {order.relay_point.city}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    €{order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};