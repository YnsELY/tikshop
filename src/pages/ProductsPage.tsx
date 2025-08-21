import React from 'react';
import { ProductSearch } from '../components/product/ProductSearch';

export const ProductsPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Rechercher un Produit
          </h1>
          <p className="text-gray-600 mb-8">
            Entrez la référence du produit que vous recherchez
          </p>
        </div>
        
        <ProductSearch />
      </div>
    </div>
  );
};