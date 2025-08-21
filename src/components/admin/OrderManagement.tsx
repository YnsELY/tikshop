import React, { useState } from 'react';
import { Package, Clock, Truck, CheckCircle, Eye, Edit, Search, Filter, Users, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useOrders } from '../../hooks/useOrders';
import { Order } from '../../types';
import { OrderStatusModal } from './OrderStatusModal';

const statusIcons = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: CheckCircle,
};

const statusColors = {
  pending: 'text-yellow-500 bg-yellow-100',
  processing: 'text-blue-500 bg-blue-100',
  shipped: 'text-purple-500 bg-purple-100',
  delivered: 'text-green-500 bg-green-100',
  cancelled: 'text-red-500 bg-red-100',
};

const statusLabels = {
  pending: 'En attente d\'expédition',
  processing: 'En cours',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const OrderManagement: React.FC = () => {
  const { allOrders, isLoading, error, refetchAll } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtrer les commandes selon le terme de recherche et le statut
  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEditStatus = (order: Order) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = () => {
    setShowStatusModal(false);
    setSelectedOrder(null);
    // Les données sont automatiquement mises à jour via le hook
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchAll();
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Statistiques des commandes
  const orderStats = {
    total: allOrders.length,
    pending: allOrders.filter(o => o.status === 'pending').length,
    processing: allOrders.filter(o => o.status === 'processing').length,
    shipped: allOrders.filter(o => o.status === 'shipped').length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
  };

  const totalRevenue = allOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total_amount, 0);


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des commandes...</p>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} isLoading={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques et bouton de rafraîchissement */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Gestion des commandes</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total commandes</p>
              <p className="text-2xl font-bold text-gray-900">{orderStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En cours de traitement</p>
              <p className="text-2xl font-bold text-blue-600">{orderStats.processing}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente d'expédition</p>
              <p className="text-2xl font-bold text-yellow-600">{orderStats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expédiées</p>
              <p className="text-2xl font-bold text-purple-600">{orderStats.shipped}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-green-600">€{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par ID, nom client, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtre par statut */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="processing">En cours</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
        </div>

        {/* Résultats de recherche */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredOrders.length} commande(s) trouvée(s)
            {searchTerm && ` pour "${searchTerm}"`}
            {statusFilter !== 'all' && ` avec le statut "${statusLabels[statusFilter as keyof typeof statusLabels]}"`}
          </span>
          {(searchTerm || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </Card>

      {/* Liste des commandes */}
      {filteredOrders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {allOrders.length === 0 ? 'Aucune commande dans la base de données' : 
               searchTerm || statusFilter !== 'all' ? 'Aucune commande trouvée' : 'Aucune commande'}
            </h3>
            <p className="text-gray-600">
              {allOrders.length === 0 ? 'Les commandes apparaîtront ici une fois créées' :
               searchTerm || statusFilter !== 'all' 
                ? 'Essayez de modifier vos critères de recherche'
                : 'Les commandes apparaîtront ici'
              }
            </p>
            {allOrders.length === 0 && (
              <Button onClick={handleRefresh} className="mt-4" isLoading={isRefreshing}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Vérifier à nouveau
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: Order) => {
            const StatusIcon = statusIcons[order.status];
            const statusColor = statusColors[order.status];
            const statusLabel = statusLabels[order.status];
            
            // Utiliser les informations du customer ou fallback sur shipping_address
            const customerInfo = order.customer || {
              first_name: order.shipping_address?.first_name || '',
              last_name: order.shipping_address?.last_name || '',
              email: order.shipping_address?.email || '',
            };
            
            return (
              <Card key={order.id} hover>
                <div className="space-y-4">
                  {/* En-tête de la commande */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-lg">
                          Commande #{order.id.slice(-8)}
                        </h4>
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusColor}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span>
                          📅 {new Date(order.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>
                          👤 {customerInfo.first_name} {customerInfo.last_name}
                        </span>
                        <span>
                          📧 {customerInfo.email}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStatus(order)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier statut
                      </Button>
                    </div>
                  </div>

                  {/* Détails de la commande */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Articles commandés */}
                    <div>
                      <h5 className="font-medium mb-3 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        Articles commandés ({order.items?.length || 0})
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                              {item.product?.image_url && (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.product?.name || 'Produit inconnu'}
                              </p>
                              <p className="text-xs text-gray-500">
                                REF: {item.product?.reference || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Qté: {item.quantity} × €{item.price.toFixed(2)}
                              </p>
                            </div>
                            <p className="text-sm font-medium">
                              €{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Informations de livraison */}
                    <div>
                      <h5 className="font-medium mb-3 flex items-center">
                        <Truck className="w-4 h-4 mr-2" />
                        Informations de livraison
                      </h5>
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h6 className="text-sm font-medium mb-1">Adresse de livraison</h6>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>{order.shipping_address?.first_name} {order.shipping_address?.last_name}</p>
                            <p>{order.shipping_address?.address}</p>
                            <p>{order.shipping_address?.postal_code} {order.shipping_address?.city}</p>
                            <p>{order.shipping_address?.country}</p>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                              <p>📧 {order.shipping_address?.email}</p>
                              <p>📞 {order.shipping_address?.phone}</p>
                            </div>
                          </div>
                        </div>

                        {order.relay_point && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <h6 className="text-sm font-medium mb-1">Point relais</h6>
                            <div className="text-sm text-gray-600">
                              <p className="font-medium">{order.relay_point.name}</p>
                              <p>{order.relay_point.address}</p>
                              <p>{order.relay_point.city}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total et informations de paiement */}
                  <div className="border-t pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>ID de paiement: <span className="font-mono">{order.payment_intent_id}</span></p>
                        <p>Dernière mise à jour: {new Date(order.updated_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total de la commande</p>
                        <p className="text-2xl font-bold text-primary-500">
                          €{order.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de modification du statut */}
      {selectedOrder && (
        <OrderStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          order={selectedOrder}
          onUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};