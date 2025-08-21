/*
  # Insertion de produits de test

  1. Nouveaux produits
    - T-shirt Premium en coton bio
    - Casque audio sans fil
    - Montre connectée fitness

  2. Données
    - Références uniques pour chaque produit
    - Prix réalistes
    - Images depuis Pexels
    - Stock disponible
    - Catégories appropriées
*/

-- Insérer 3 produits de test
INSERT INTO products (reference, name, description, price, image_url, stock, category, seller_id) VALUES
(
  'TSHIRT-BIO-2025',
  'T-shirt Premium Coton Bio',
  'T-shirt confortable et élégant en coton 100% biologique. Parfait pour un usage quotidien avec une coupe moderne et respirante. Disponible en plusieurs tailles.',
  34.99,
  'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=800',
  25,
  'Vêtements',
  NULL
),
(
  'CASQUE-WIRELESS-PRO',
  'Casque Audio Sans Fil Premium',
  'Casque audio haute qualité avec réduction de bruit active et autonomie de 30h. Son cristallin et confort optimal pour une expérience d''écoute exceptionnelle.',
  159.99,
  'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=800',
  15,
  'Électronique',
  NULL
),
(
  'MONTRE-SPORT-CONNECT',
  'Montre Connectée Sport & Fitness',
  'Montre intelligente avec suivi d''activité, GPS intégré et monitoring cardiaque. Étanche et autonomie de 7 jours. Parfaite pour les sportifs et la vie quotidienne.',
  249.99,
  'https://images.pexels.com/photos/1432679/pexels-photo-1432679.jpeg?auto=compress&cs=tinysrgb&w=800',
  12,
  'Électronique',
  NULL
)
ON CONFLICT (reference) DO NOTHING;