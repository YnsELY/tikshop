import { supabase } from './lib/supabase';

export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'PULL-LAINE-HIVER',
    priceId: 'price_1RkrV5LvKNaGPjzpJIWPQTse',
    name: 'Pull en Laine d\'Hiver',
    description: 'Pull chaud en laine mérinos, idéal pour les journées froides. Doux et confortable.',
    mode: 'payment',
    price: 89.99
  },
  {
    id: 'PULL-BASIC',
    priceId: 'price_1RnhR1LvKNaGPjzprzfmRe0h',
    name: 'Pull',
    description: 'Pull confortable et élégant pour toutes les occasions.',
    mode: 'payment',
    price: 24.99
  },
  {
    id: 'ROBE-TISSUE',
    priceId: 'price_1RkrV3LvKNaGPjzpTEkYRmKx',
    name: 'Robe Tissue',
    description: 'Robe élégante en tissu de qualité supérieure.',
    mode: 'payment',
    price: 29.99
  },
  {
    id: 'ROBE-ETE-FLEURIE',
    priceId: 'price_1RkrV2LvKNaGPjzpqiVULgjh',
    name: 'Robe d\'Été Fleurie',
    description: 'Robe légère et colorée, parfaite pour l\'été. Motifs floraux tendance.',
    mode: 'payment',
    price: 59.99
  },
  {
    id: 'CHEMISE-BUSINESS',
    priceId: 'price_1RkrV1LvKNaGPjzpTn6ioS0F',
    name: 'Chemise Business',
    description: 'Chemise élégante pour le bureau. Coupe ajustée et tissu de qualité.',
    mode: 'payment',
    price: 49.99
  },
  {
    id: 'JEAN-SLIM-CLASSIQUE',
    priceId: 'price_1RkrV0LvKNaGPjzpsLCGyTOq',
    name: 'Jean Slim Classique',
    description: 'Jean slim fit en denim de qualité supérieure. Coupe moderne et élégante.',
    mode: 'payment',
    price: 79.99
  },
  {
    id: 'MONTRE-CONNECTEE-SPORT',
    priceId: 'price_1RkrUzLvKNaGPjzpImZgm72B',
    name: 'Montre Connectée Sport & Fitness',
    description: 'Montre intelligente avec suivi d\'activité, GPS intégré et monitoring cardiaque. Étanche et autonomie de 7 jours. Parfaite pour les sportifs et la vie quotidienne.',
    mode: 'payment',
    price: 249.99
  },
  {
    id: 'CASQUE-AUDIO-PREMIUM',
    priceId: 'price_1RkrUyLvKNaGPjzpccbJTq6c',
    name: 'Casque Audio Sans Fil Premium',
    description: 'Casque audio haute qualité avec réduction de bruit active et autonomie de 30h. Son cristallin et confort optimal pour une expérience d\'écoute exceptionnelle.',
    mode: 'payment',
    price: 159.99
  },
  {
    id: 'TSHIRT-BIO-2025',
    priceId: 'price_1RkrUxLvKNaGPjzpsEvokSKg',
    name: 'T-shirt Premium Coton Bio',
    description: 'T-shirt confortable et élégant en coton 100% biologique. Parfait pour un usage quotidien avec une coupe moderne et respirante. Disponible en plusieurs tailles.',
    mode: 'payment',
    price: 34.99
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};

// IDs des Shipping Rates Stripe
export const SHIPPING_RATE_ID_FIRST = "shr_1RwnghLvKNaGPjzpHOhrxqlA"; // 6€ pour première commande
export const SHIPPING_RATE_ID_FREE = "shr_1RnhReLvKNaGPjzp0YYDVaaO"; // 0€ pour commandes suivantes

// Fonction pour déterminer le shipping rate à utiliser
export const getShippingRateId = async (userId: string): Promise<string> => {
  try {
    // Calculer la date limite (24h en arrière)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Vérifier s'il y a des commandes dans les dernières 24h
    const { data: recentOrders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .limit(1);
    
    if (error) {
      console.error('Error checking recent orders:', error);
      // En cas d'erreur, utiliser le tarif de première commande par sécurité
      return SHIPPING_RATE_ID_FIRST;
    }
    
    // Si des commandes existent dans les 24h, livraison gratuite
    if (recentOrders && recentOrders.length > 0) {
      console.log('🆓 User has recent orders, using free shipping');
      return SHIPPING_RATE_ID_FREE;
    }
    
    // Sinon, première commande ou pas de commande récente
    console.log('💰 First order or no recent orders, using paid shipping');
    return SHIPPING_RATE_ID_FIRST;
    
  } catch (error) {
    console.error('Error in getShippingRateId:', error);
    // En cas d'erreur, utiliser le tarif de première commande par sécurité
    return SHIPPING_RATE_ID_FIRST;
  }
};

// Fonction pour obtenir le prix de livraison en euros
export const getShippingPrice = async (userId: string): Promise<number> => {
  const shippingRateId = await getShippingRateId(userId);
  return shippingRateId === SHIPPING_RATE_ID_FREE ? 0 : 6;
};

// Export de compatibilité pour l'ancien code