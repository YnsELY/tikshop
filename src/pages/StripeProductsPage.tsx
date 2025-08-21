import React from 'react';
import { Link } from 'react-router-dom';
import { StripeProductCard } from '../components/stripe/StripeProductCard';
import { stripeProducts } from '../stripe-config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const StripeProductsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Nos Produits
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Découvrez notre collection de produits de qualité, disponibles à l'achat immédiat avec paiement sécurisé par Stripe.
        </p>
      </div>

      {/* Grille des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stripeProducts.map((product) => (
          <StripeProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Informations sur les paiements */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Paiement Sécurisé
          </h3>
          <p className="text-blue-800">
            Tous les paiements sont traités de manière sécurisée par Stripe. 
            Vos informations bancaires ne sont jamais stockées sur nos serveurs.
          </p>
        </div>
      </Card>
    </div>
  );
};