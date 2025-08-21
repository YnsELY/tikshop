/*
  # Système de variantes de produits avec couleurs et tailles

  1. Nouvelles tables
    - `product_variants` : Variantes de produits avec couleur, taille et stock séparé
  
  2. Modifications
    - Suppression de la colonne `stock` de la table `products`
    - Ajout d'index pour optimiser les performances
  
  3. Sécurité
    - Activation de RLS sur `product_variants`
    - Politiques pour lecture publique et gestion par les vendeurs
  
  4. Données de test
    - 5 produits de vêtements avec variantes complètes
    - Couleurs et tailles multiples avec stocks différents
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

-- Créer des UUIDs pour les vendeurs de test
DO $$
DECLARE
  seller1_id uuid := gen_random_uuid();
  seller2_id uuid := gen_random_uuid();
  seller3_id uuid := gen_random_uuid();
  seller4_id uuid := gen_random_uuid();
  seller5_id uuid := gen_random_uuid();
  
  tshirt_id uuid;
  jean_id uuid;
  pull_id uuid;
  robe_id uuid;
  chemise_id uuid;
BEGIN
  -- Insérer des produits de test de type vêtements
  INSERT INTO products (reference, name, description, price, image_url, category, seller_id) VALUES
  ('TSHIRT-BIO-2025', 'T-Shirt Bio Premium', 'T-shirt en coton biologique, coupe moderne et confortable. Parfait pour un style décontracté.', 29.99, 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', seller1_id),
  ('JEAN-SLIM-CLASSIC', 'Jean Slim Classique', 'Jean slim fit en denim de qualité supérieure. Coupe moderne et élégante.', 79.99, 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', seller2_id),
  ('PULL-LAINE-HIVER', 'Pull en Laine d''Hiver', 'Pull chaud en laine mérinos, idéal pour les journées froides. Doux et confortable.', 89.99, 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', seller3_id),
  ('ROBE-ETE-FLEURIE', 'Robe d''Été Fleurie', 'Robe légère et colorée, parfaite pour l''été. Motifs floraux tendance.', 59.99, 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', seller4_id),
  ('CHEMISE-BUSINESS', 'Chemise Business', 'Chemise élégante pour le bureau. Coupe ajustée et tissu de qualité.', 49.99, 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400', 'Vêtements', seller5_id)
  ON CONFLICT (reference) DO NOTHING;

  -- Récupérer les IDs des produits créés
  SELECT id INTO tshirt_id FROM products WHERE reference = 'TSHIRT-BIO-2025';
  SELECT id INTO jean_id FROM products WHERE reference = 'JEAN-SLIM-CLASSIC';
  SELECT id INTO pull_id FROM products WHERE reference = 'PULL-LAINE-HIVER';
  SELECT id INTO robe_id FROM products WHERE reference = 'ROBE-ETE-FLEURIE';
  SELECT id INTO chemise_id FROM products WHERE reference = 'CHEMISE-BUSINESS';

  -- Insérer les variantes pour le T-Shirt Bio
  IF tshirt_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, color, size, stock, sku) VALUES
    (tshirt_id, 'Blanc', 'XS', 5, 'TSHIRT-BIO-2025-BLANC-XS'),
    (tshirt_id, 'Blanc', 'S', 12, 'TSHIRT-BIO-2025-BLANC-S'),
    (tshirt_id, 'Blanc', 'M', 15, 'TSHIRT-BIO-2025-BLANC-M'),
    (tshirt_id, 'Blanc', 'L', 10, 'TSHIRT-BIO-2025-BLANC-L'),
    (tshirt_id, 'Blanc', 'XL', 8, 'TSHIRT-BIO-2025-BLANC-XL'),
    (tshirt_id, 'Noir', 'XS', 3, 'TSHIRT-BIO-2025-NOIR-XS'),
    (tshirt_id, 'Noir', 'S', 8, 'TSHIRT-BIO-2025-NOIR-S'),
    (tshirt_id, 'Noir', 'M', 12, 'TSHIRT-BIO-2025-NOIR-M'),
    (tshirt_id, 'Noir', 'L', 7, 'TSHIRT-BIO-2025-NOIR-L'),
    (tshirt_id, 'Noir', 'XL', 5, 'TSHIRT-BIO-2025-NOIR-XL'),
    (tshirt_id, 'Bleu Marine', 'XS', 2, 'TSHIRT-BIO-2025-BLEU-XS'),
    (tshirt_id, 'Bleu Marine', 'S', 6, 'TSHIRT-BIO-2025-BLEU-S'),
    (tshirt_id, 'Bleu Marine', 'M', 9, 'TSHIRT-BIO-2025-BLEU-M'),
    (tshirt_id, 'Bleu Marine', 'L', 4, 'TSHIRT-BIO-2025-BLEU-L'),
    (tshirt_id, 'Bleu Marine', 'XL', 3, 'TSHIRT-BIO-2025-BLEU-XL')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Insérer les variantes pour le Jean Slim
  IF jean_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, color, size, stock, sku) VALUES
    (jean_id, 'Bleu Délavé', '28', 4, 'JEAN-SLIM-CLASSIC-BLEU-28'),
    (jean_id, 'Bleu Délavé', '30', 8, 'JEAN-SLIM-CLASSIC-BLEU-30'),
    (jean_id, 'Bleu Délavé', '32', 12, 'JEAN-SLIM-CLASSIC-BLEU-32'),
    (jean_id, 'Bleu Délavé', '34', 10, 'JEAN-SLIM-CLASSIC-BLEU-34'),
    (jean_id, 'Bleu Délavé', '36', 6, 'JEAN-SLIM-CLASSIC-BLEU-36'),
    (jean_id, 'Noir', '28', 3, 'JEAN-SLIM-CLASSIC-NOIR-28'),
    (jean_id, 'Noir', '30', 7, 'JEAN-SLIM-CLASSIC-NOIR-30'),
    (jean_id, 'Noir', '32', 9, 'JEAN-SLIM-CLASSIC-NOIR-32'),
    (jean_id, 'Noir', '34', 8, 'JEAN-SLIM-CLASSIC-NOIR-34'),
    (jean_id, 'Noir', '36', 4, 'JEAN-SLIM-CLASSIC-NOIR-36'),
    (jean_id, 'Gris', '28', 2, 'JEAN-SLIM-CLASSIC-GRIS-28'),
    (jean_id, 'Gris', '30', 5, 'JEAN-SLIM-CLASSIC-GRIS-30'),
    (jean_id, 'Gris', '32', 7, 'JEAN-SLIM-CLASSIC-GRIS-32'),
    (jean_id, 'Gris', '34', 6, 'JEAN-SLIM-CLASSIC-GRIS-34'),
    (jean_id, 'Gris', '36', 3, 'JEAN-SLIM-CLASSIC-GRIS-36')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Insérer les variantes pour le Pull en Laine
  IF pull_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, color, size, stock, sku) VALUES
    (pull_id, 'Beige', 'S', 6, 'PULL-LAINE-HIVER-BEIGE-S'),
    (pull_id, 'Beige', 'M', 10, 'PULL-LAINE-HIVER-BEIGE-M'),
    (pull_id, 'Beige', 'L', 8, 'PULL-LAINE-HIVER-BEIGE-L'),
    (pull_id, 'Beige', 'XL', 5, 'PULL-LAINE-HIVER-BEIGE-XL'),
    (pull_id, 'Bordeaux', 'S', 4, 'PULL-LAINE-HIVER-BORDEAUX-S'),
    (pull_id, 'Bordeaux', 'M', 7, 'PULL-LAINE-HIVER-BORDEAUX-M'),
    (pull_id, 'Bordeaux', 'L', 6, 'PULL-LAINE-HIVER-BORDEAUX-L'),
    (pull_id, 'Bordeaux', 'XL', 3, 'PULL-LAINE-HIVER-BORDEAUX-XL'),
    (pull_id, 'Vert Sapin', 'S', 3, 'PULL-LAINE-HIVER-VERT-S'),
    (pull_id, 'Vert Sapin', 'M', 5, 'PULL-LAINE-HIVER-VERT-M'),
    (pull_id, 'Vert Sapin', 'L', 4, 'PULL-LAINE-HIVER-VERT-L'),
    (pull_id, 'Vert Sapin', 'XL', 2, 'PULL-LAINE-HIVER-VERT-XL')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Insérer les variantes pour la Robe d'Été
  IF robe_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, color, size, stock, sku) VALUES
    (robe_id, 'Rose Fleurie', 'XS', 4, 'ROBE-ETE-FLEURIE-ROSE-XS'),
    (robe_id, 'Rose Fleurie', 'S', 8, 'ROBE-ETE-FLEURIE-ROSE-S'),
    (robe_id, 'Rose Fleurie', 'M', 12, 'ROBE-ETE-FLEURIE-ROSE-M'),
    (robe_id, 'Rose Fleurie', 'L', 9, 'ROBE-ETE-FLEURIE-ROSE-L'),
    (robe_id, 'Rose Fleurie', 'XL', 6, 'ROBE-ETE-FLEURIE-ROSE-XL'),
    (robe_id, 'Bleu Fleurie', 'XS', 3, 'ROBE-ETE-FLEURIE-BLEU-XS'),
    (robe_id, 'Bleu Fleurie', 'S', 7, 'ROBE-ETE-FLEURIE-BLEU-S'),
    (robe_id, 'Bleu Fleurie', 'M', 10, 'ROBE-ETE-FLEURIE-BLEU-M'),
    (robe_id, 'Bleu Fleurie', 'L', 8, 'ROBE-ETE-FLEURIE-BLEU-L'),
    (robe_id, 'Bleu Fleurie', 'XL', 5, 'ROBE-ETE-FLEURIE-BLEU-XL'),
    (robe_id, 'Jaune Fleurie', 'XS', 2, 'ROBE-ETE-FLEURIE-JAUNE-XS'),
    (robe_id, 'Jaune Fleurie', 'S', 5, 'ROBE-ETE-FLEURIE-JAUNE-S'),
    (robe_id, 'Jaune Fleurie', 'M', 7, 'ROBE-ETE-FLEURIE-JAUNE-M'),
    (robe_id, 'Jaune Fleurie', 'L', 6, 'ROBE-ETE-FLEURIE-JAUNE-L'),
    (robe_id, 'Jaune Fleurie', 'XL', 3, 'ROBE-ETE-FLEURIE-JAUNE-XL')
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Insérer les variantes pour la Chemise Business
  IF chemise_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, color, size, stock, sku) VALUES
    (chemise_id, 'Blanc', 'S', 8, 'CHEMISE-BUSINESS-BLANC-S'),
    (chemise_id, 'Blanc', 'M', 12, 'CHEMISE-BUSINESS-BLANC-M'),
    (chemise_id, 'Blanc', 'L', 10, 'CHEMISE-BUSINESS-BLANC-L'),
    (chemise_id, 'Blanc', 'XL', 7, 'CHEMISE-BUSINESS-BLANC-XL'),
    (chemise_id, 'Bleu Ciel', 'S', 6, 'CHEMISE-BUSINESS-BLEU-S'),
    (chemise_id, 'Bleu Ciel', 'M', 9, 'CHEMISE-BUSINESS-BLEU-M'),
    (chemise_id, 'Bleu Ciel', 'L', 8, 'CHEMISE-BUSINESS-BLEU-L'),
    (chemise_id, 'Bleu Ciel', 'XL', 5, 'CHEMISE-BUSINESS-BLEU-XL'),
    (chemise_id, 'Rose Pâle', 'S', 4, 'CHEMISE-BUSINESS-ROSE-S'),
    (chemise_id, 'Rose Pâle', 'M', 6, 'CHEMISE-BUSINESS-ROSE-M'),
    (chemise_id, 'Rose Pâle', 'L', 5, 'CHEMISE-BUSINESS-ROSE-L'),
    (chemise_id, 'Rose Pâle', 'XL', 3, 'CHEMISE-BUSINESS-ROSE-XL')
    ON CONFLICT (sku) DO NOTHING;
  END IF;
END $$;