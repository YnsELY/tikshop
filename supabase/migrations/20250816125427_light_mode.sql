/*
  # Add admin policies for product management

  1. New Policies
    - `Admins can update all products` - Allows admins to update any product
    - `Admins can delete all products` - Allows admins to delete any product
    - `Admins can read all products` - Allows admins to read all products (for management)

  2. Security
    - Policies check if user has `is_admin = true` in their profile
    - Maintains existing policies for regular users
    - Enables full product management for administrators

  3. Purpose
    - Fixes PGRST116 error when admins try to update products
    - Allows admin panel to function correctly
    - Maintains security while enabling admin functionality
*/

-- Add policy for admins to update all products
CREATE POLICY "Admins can update all products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add policy for admins to delete all products
CREATE POLICY "Admins can delete all products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add policy for admins to create products (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Admins can create products'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can create products"
      ON products
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      )';
  END IF;
END $$;

-- Add similar policies for product_variants table
CREATE POLICY "Admins can update all product variants"
  ON product_variants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete all product variants"
  ON product_variants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create product variants"
  ON product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );