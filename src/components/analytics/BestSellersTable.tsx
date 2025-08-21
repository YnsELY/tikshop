import React from 'react';
import { Trophy, TrendingUp, Package } from 'lucide-react';

interface BestSeller {
  product_id: string;
  product_name: string;
  product_reference: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  orders_count: number;
  image_url: string;
}

interface BestSellersTableProps {
  data: BestSeller[];
}

export const BestSellersTable: React.FC<BestSellersTableProps> = ({ data }) => {
  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{index + 1}</span>;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Aucune vente sur cette période</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Rang</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Produit</th>
            <th className="text-right py-3 px-4 font-medium text-gray-700">Quantité</th>
            <th className="text-right py-3 px-4 font-medium text-gray-700">Revenus</th>
            <th className="text-right py-3 px-4 font-medium text-gray-700">Commandes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.product_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="flex items-center">
                  {getRankIcon(index)}
                </div>
              </td>
              
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {item.product_name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        REF: {item.product_reference}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end space-x-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-gray-900">
                    {item.total_quantity}
                  </span>
                </div>
              </td>
              
              <td className="py-4 px-4 text-right">
                <span className="font-semibold text-green-600">
                  {formatCurrency(item.total_revenue)}
                </span>
              </td>
              
              <td className="py-4 px-4 text-right">
                <span className="text-gray-600">
                  {item.orders_count}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};