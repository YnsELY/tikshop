/*
  # Ajout du système de variantes de produits

  1. Nouvelles Tables
    - `product_variants`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key vers products)
      - `color` (text, couleur du produit)
      - `size` (text, taille du produit)
      - `stock` (integer, stock pour cette variante)
      - `sku` (text, référence unique pour cette variante)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Modifications
    - Suppression de la colonne `stock` de la table `products`
    - Le stock sera maintenant géré au niveau des variantes

  3. Sécurité
    - Enable RLS sur `product_variants`
    - Politiques pour la lecture publique et gestion par les vendeurs
*/

-- Créer la table des variantes de produits
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Supprimer la colonne stock de la table products si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock'
  ) THEN
    ALTER TABLE products DROP COLUMN stock;
  END IF;
END $$;

-- Activer RLS sur product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture publique des variantes
CREATE POLICY "Product variants are publicly readable"
  ON product_variants
  FOR SELECT
  TO public
  USING (true);

-- Politique pour que les vendeurs puissent gérer leurs variantes de produits
CREATE POLICY "Sellers can manage own product variants"
  ON product_variants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_variants.product_id 
      AND products.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_variants.product_id 
      AND products.seller_id = auth.uid()
    )
  );

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color);
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- Insérer des produits de test de type vêtements
INSERT INTO products (reference, name, description, price, image_url, category, seller_id) VALUES
('TSHIRT-BIO-2025', 'T-Shirt Bio Premium', 'T-shirt en coton biologique, coupe moderne et confortable. Parfait pour un style décontracté.', 29.99, 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', 'seller1'),
('JEAN-SLIM-CLASSIC', 'Jean Slim Classique', 'Jean slim fit en denim de qualité supérieure. Coupe moderne et élégante.', 79.99, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', 'seller2'),
('PULL-LAINE-HIVER', 'Pull en Laine d''Hiver', 'Pull chaud en laine mérinos, idéal pour les journées froides. Doux et confortable.', 89.99, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', 'seller3'),
('ROBE-ETE-FLEURIE', 'Robe d''Été Fleurie', 'Robe légère et colorée, parfaite pour l''été. Motifs floraux tendance.', 59.99, 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', 'seller4'),
('CHEMISE-BUSINESS', 'Chemise Business', 'Chemise élégante pour le bureau. Coupe ajustée et tissu de qualité.', 49.99, 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', 'seller5')
ON CONFLICT (reference) DO NOTHING;

-- Insérer les variantes pour le T-Shirt Bio
INSERT INTO product_variants (product_id, color, size, stock, sku) 
SELECT p.id, color, size, stock, sku FROM products p, (VALUES
  ('Blanc', 'XS', 5, 'TSHIRT-BIO-2025-BLANC-XS'),
  ('Blanc', 'S', 12, 'TSHIRT-BIO-2025-BLANC-S'),
  ('Blanc', 'M', 15, 'TSHIRT-BIO-2025-BLANC-M'),
  ('Blanc', 'L', 10, 'TSHIRT-BIO-2025-BLANC-L'),
  ('Blanc', 'XL', 8, 'TSHIRT-BIO-2025-BLANC-XL'),
  ('Noir', 'XS', 3, 'TSHIRT-BIO-2025-NOIR-XS'),
  ('Noir', 'S', 8, 'TSHIRT-BIO-2025-NOIR-S'),
  ('Noir', 'M', 12, 'TSHIRT-BIO-2025-NOIR-M'),
  ('Noir', 'L', 7, 'TSHIRT-BIO-2025-NOIR-L'),
  ('Noir', 'XL', 5, 'TSHIRT-BIO-2025-NOIR-XL'),
  ('Bleu Marine', 'XS', 2, 'TSHIRT-BIO-2025-BLEU-XS'),
  ('Bleu Marine', 'S', 6, 'TSHIRT-BIO-2025-BLEU-S'),
  ('Bleu Marine', 'M', 9, 'TSHIRT-BIO-2025-BLEU-M'),
  ('Bleu Marine', 'L', 4, 'TSHIRT-BIO-2025-BLEU-L'),
  ('Bleu Marine', 'XL', 3, 'TSHIRT-BIO-2025-BLEU-XL')
) AS v(color, size, stock, sku)
WHERE p.reference = 'TSHIRT-BIO-2025'
ON CONFLICT (sku) DO NOTHING;

-- Insérer les variantes pour le Jean Slim
INSERT INTO product_variants (product_id, color, size, stock, sku) 
SELECT p.id, color, size, stock, sku FROM products p, (VALUES
  ('Bleu Délavé', '28', 4, 'JEAN-SLIM-CLASSIC-BLEU-28'),
  ('Bleu Délavé', '30', 8, 'JEAN-SLIM-CLASSIC-BLEU-30'),
  ('Bleu Délavé', '32', 12, 'JEAN-SLIM-CLASSIC-BLEU-32'),
  ('Bleu Délavé', '34', 10, 'JEAN-SLIM-CLASSIC-BLEU-34'),
  ('Bleu Délavé', '36', 6, 'JEAN-SLIM-CLASSIC-BLEU-36'),
  ('Noir', '28', 3, 'JEAN-SLIM-CLASSIC-NOIR-28'),
  ('Noir', '30', 7, 'JEAN-SLIM-CLASSIC-NOIR-30'),
  ('Noir', '32', 9, 'JEAN-SLIM-CLASSIC-NOIR-32'),
  ('Noir', '34', 8, 'JEAN-SLIM-CLASSIC-NOIR-34'),
  ('Noir', '36', 4, 'JEAN-SLIM-CLASSIC-NOIR-36'),
  ('Gris', '28', 2, 'JEAN-SLIM-CLASSIC-GRIS-28'),
  ('Gris', '30', 5, 'JEAN-SLIM-CLASSIC-GRIS-30'),
  ('Gris', '32', 7, 'JEAN-SLIM-CLASSIC-GRIS-32'),
  ('Gris', '34', 6, 'JEAN-SLIM-CLASSIC-GRIS-34'),
  ('Gris', '36', 3, 'JEAN-SLIM-CLASSIC-GRIS-36')
) AS v(color, size, stock, sku)
WHERE p.reference = 'JEAN-SLIM-CLASSIC'
ON CONFLICT (sku) DO NOTHING;

-- Insérer les variantes pour le Pull en Laine
INSERT INTO product_variants (product_id, color, size, stock, sku) 
SELECT p.id, color, size, stock, sku FROM products p, (VALUES
  ('Beige', 'S', 6, 'PULL-LAINE-HIVER-BEIGE-S'),
  ('Beige', 'M', 10, 'PULL-LAINE-HIVER-BEIGE-M'),
  ('Beige', 'L', 8, 'PULL-LAINE-HIVER-BEIGE-L'),
  ('Beige', 'XL', 5, 'PULL-LAINE-HIVER-BEIGE-XL'),
  ('Bordeaux', 'S', 4, 'PULL-LAINE-HIVER-BORDEAUX-S'),
  ('Bordeaux', 'M', 7, 'PULL-LAINE-HIVER-BORDEAUX-M'),
  ('Bordeaux', 'L', 6, 'PULL-LAINE-HIVER-BORDEAUX-L'),
  ('Bordeaux', 'XL', 3, 'PULL-LAINE-HIVER-BORDEAUX-XL'),
  ('Vert Sapin', 'S', 3, 'PULL-LAINE-HIVER-VERT-S'),
  ('Vert Sapin', 'M', 5, 'PULL-LAINE-HIVER-VERT-M'),
  ('Vert Sapin', 'L', 4, 'PULL-LAINE-HIVER-VERT-L'),
  ('Vert Sapin', 'XL', 2, 'PULL-LAINE-HIVER-VERT-XL')
) AS v(color, size, stock, sku)
WHERE p.reference = 'PULL-LAINE-HIVER'
ON CONFLICT (sku) DO NOTHING;

-- Insérer les variantes pour la Robe d'Été
INSERT INTO product_variants (product_id, color, size, stock, sku) 
SELECT p.id, color, size, stock, sku FROM products p, (VALUES
  ('Rose Fleurie', 'XS', 4, 'ROBE-ETE-FLEURIE-ROSE-XS'),
  ('Rose Fleurie', 'S', 8, 'ROBE-ETE-FLEURIE-ROSE-S'),
  ('Rose Fleurie', 'M', 12, 'ROBE-ETE-FLEURIE-ROSE-M'),
  ('Rose Fleurie', 'L', 9, 'ROBE-ETE-FLEURIE-ROSE-L'),
  ('Rose Fleurie', 'XL', 6, 'ROBE-ETE-FLEURIE-ROSE-XL'),
  ('Bleu Fleurie', 'XS', 3, 'ROBE-ETE-FLEURIE-BLEU-XS'),
  ('Bleu Fleurie', 'S', 7, 'ROBE-ETE-FLEURIE-BLEU-S'),
  ('Bleu Fleurie', 'M', 10, 'ROBE-ETE-FLEURIE-BLEU-M'),
  ('Bleu Fleurie', 'L', 8, 'ROBE-ETE-FLEURIE-BLEU-L'),
  ('Bleu Fleurie', 'XL', 5, 'ROBE-ETE-FLEURIE-BLEU-XL'),
  ('Jaune Fleurie', 'XS', 2, 'ROBE-ETE-FLEURIE-JAUNE-XS'),
  ('Jaune Fleurie', 'S', 5, 'ROBE-ETE-FLEURIE-JAUNE-S'),
  ('Jaune Fleurie', 'M', 7, 'ROBE-ETE-FLEURIE-JAUNE-M'),
  ('Jaune Fleurie', 'L', 6, 'ROBE-ETE-FLEURIE-JAUNE-L'),
  ('Jaune Fleurie', 'XL', 3, 'ROBE-ETE-FLEURIE-JAUNE-XL')
) AS v(color, size, stock, sku)
WHERE p.reference = 'ROBE-ETE-FLEURIE'
ON CONFLICT (sku) DO NOTHING;

-- Insérer les variantes pour la Chemise Business
INSERT INTO product_variants (product_id, color, size, stock, sku) 
SELECT p.id, color, size, stock, sku FROM products p, (VALUES
  ('Blanc', 'S', 8, 'CHEMISE-BUSINESS-BLANC-S'),
  ('Blanc', 'M', 12, 'CHEMISE-BUSINESS-BLANC-M'),
  ('Blanc', 'L', 10, 'CHEMISE-BUSINESS-BLANC-L'),
  ('Blanc', 'XL', 7, 'CHEMISE-BUSINESS-BLANC-XL'),
  ('Bleu Ciel', 'S', 6, 'CHEMISE-BUSINESS-BLEU-S'),
  ('Bleu Ciel', 'M', 9, 'CHEMISE-BUSINESS-BLEU-M'),
  ('Bleu Ciel', 'L', 8, 'CHEMISE-BUSINESS-BLEU-L'),
  ('Bleu Ciel', 'XL', 5, 'CHEMISE-BUSINESS-BLEU-XL'),
  ('Rose Pâle', 'S', 4, 'CHEMISE-BUSINESS-ROSE-S'),
  ('Rose Pâle', 'M', 6, 'CHEMISE-BUSINESS-ROSE-M'),
  ('Rose Pâle', 'L', 5, 'CHEMISE-BUSINESS-ROSE-L'),
  ('Rose Pâle', 'XL', 3, 'CHEMISE-BUSINESS-ROSE-XL')
) AS v(color, size, stock, sku)
WHERE p.reference = 'CHEMISE-BUSINESS'
ON CONFLICT (sku) DO NOTHING;