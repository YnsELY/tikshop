import React, { useState } from 'react';
import { Package, Clock, Truck, CheckCircle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Order } from '../../types';
import { useOrders } from '../../hooks/useOrders';
import toast from 'react-hot-toast';

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'pending', label: 'En attente d\'expédition', icon: Clock, color: 'text-yellow-500' },
  { value: 'processing', label: 'En cours de traitement', icon: Package, color: 'text-blue-500' },
  { value: 'shipped', label: 'Expédiée', icon: Truck, color: 'text-purple-500' },
  { value: 'delivered', label: 'Livrée', icon: CheckCircle, color: 'text-green-500' },
  { value: 'cancelled', label: 'Annulée', icon: X, color: 'text-red-500' },
];

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdate,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [isLoading, setIsLoading] = useState(false);
  const { updateOrderStatus } = useOrders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStatus === order.status) {
      toast.info('Aucun changement détecté');
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      await updateOrderStatus(order.id, selectedStatus);
      
      toast.success('Statut de la commande mis à jour avec succès');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier le statut de la commande">
      <div className="space-y-6">
        {/* Informations de la commande */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">
            Commande #{order.id.slice(-8)}
          </h4>
          <p className="text-sm text-gray-600">
            Client: {order.shipping_address?.first_name} {order.shipping_address?.last_name}
          </p>
          <p className="text-sm text-gray-600">
            Montant: €{order.total_amount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Date: {new Date(order.created_at).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-sm text-gray-600">
            Statut actuel: <span className="font-medium">{statusOptions.find(s => s.value === order.status)?.label}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nouveau statut
            </label>
            <div className="space-y-2">
              {statusOptions.map((status) => {
                const Icon = status.icon;
                const isSelected = selectedStatus === status.value;
                
                return (
                  <label
                    key={status.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#8b6b5a] bg-[#faeede]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status.value}
                      checked={isSelected}
                      onChange={(e) => setSelectedStatus(e.target.value as any)}
                      className="sr-only"
                    />
                    <Icon className={`w-5 h-5 ${status.color}`} />
                    <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                      {status.label}
                    </span>
                    {isSelected && (
                      <div className="ml-auto">
                        <CheckCircle className="w-5 h-5 text-[#8b6b5a]" />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              isLoading={isLoading}
              disabled={selectedStatus === order.status}
            >
              {selectedStatus === order.status ? 'Aucun changement' : 'Mettre à jour'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};