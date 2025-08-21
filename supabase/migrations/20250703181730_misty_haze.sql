/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `reference` (text, unique)
      - `name` (text)
      - `description` (text)
      - `price` (decimal)
      - `image_url` (text)
      - `stock` (integer)
      - `category` (text)
      - `seller_id` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access
    - Add policy for sellers to manage their own products
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  image_url text NOT NULL DEFAULT '',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category text NOT NULL DEFAULT 'General',
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre la lecture publique des produits
CREATE POLICY "Products are publicly readable"
  ON products
  FOR SELECT
  TO public
  USING (true);

-- Policy pour permettre aux vendeurs de gérer leurs propres produits
CREATE POLICY "Sellers can manage own products"
  ON products
  FOR ALL
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);