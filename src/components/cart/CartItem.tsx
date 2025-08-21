import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '../../types';
import { useCartStore } from '../../store/cartStore';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();

  // Debug pour vérifier les données du produit
  React.useEffect(() => {
    console.log('🛒 CartItem - Product data:', {
      id: item.product.id,
      name: item.product.name,
      reference: item.product.reference,
      image_url: item.product.image_url,
      hasImage: !!item.product.image_url
    });
  }, [item.product]);

  const handleQuantityChange = (newQuantity: number) => {
    updateQuantity(item.product.id, newQuantity, item.variant?.id);
  };

  const handleRemove = () => {
    removeItem(item.product.id, item.variant?.id);
  };

  const maxStock = item.variant?.stock || 999;

  return (
    <div className="flex items-center space-x-4 py-6 border-b border-gray-200">
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
        {item.product.image_url ? (
          <img
            src={item.product.image_url}
            alt={item.product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load image:', item.product.image_url);
              e.currentTarget.src = 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=400';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">Pas d'image</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg text-gray-900 mb-1">{item.product.name}</h3>
        <p className="text-sm text-gray-500 mb-1">REF: {item.product.reference}</p>
        {item.variant && (
          <p className="text-sm text-gray-500 mb-2">
            {item.variant.color} - {item.variant.size}
          </p>
        )}
        <p className="text-xl font-bold text-[#8b6b5a]">
          €{item.product.price.toFixed(2)}
        </p>
      </div>
      
      <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-2">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={item.quantity <= 1}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={item.quantity >= maxStock}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <button
        onClick={handleRemove}
        className="p-3 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      
      <div className="text-right">
        <p className="font-bold text-xl text-gray-900">
          €{(item.product.price * item.quantity).toFixed(2)}
        </p>
        <p className="text-sm text-gray-500">
          Total pour cet article
        </p>
      </div>
    </div>
  );
};