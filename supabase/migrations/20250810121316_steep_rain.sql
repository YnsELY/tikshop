/*
  # Ensure stripe_price_id column exists in products table

  1. Column Addition
    - Add `stripe_price_id` column to products table if it doesn't exist
    - Set as nullable TEXT field with default NULL
    - Add index for performance

  2. Purpose
    - Fix PGRST204 error during Stripe synchronization
    - Ensure the column exists for storing Stripe Price IDs
    - Enable proper Stripe payment integration

  3. Safety
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Includes proper indexing for query performance
*/

-- Add the stripe_price_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE products ADD COLUMN stripe_price_id TEXT DEFAULT NULL;
    RAISE NOTICE 'Column stripe_price_id added to products table';
  ELSE
    RAISE NOTICE 'Column stripe_price_id already exists in products table';
  END IF;
END $$;

-- Add index for better performance when querying by stripe_price_id
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_id ON products(stripe_price_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN products.stripe_price_id IS 'Stripe Price ID for the product, used for direct checkout integration';

-- Verify the column exists and show current state
DO $$
DECLARE
  column_exists BOOLEAN;
  products_count INTEGER;
  products_with_stripe_id INTEGER;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stripe_price_id'
  ) INTO column_exists;
  
  -- Count total products
  SELECT COUNT(*) FROM products INTO products_count;
  
  -- Count products with stripe_price_id
  SELECT COUNT(*) FROM products WHERE stripe_price_id IS NOT NULL INTO products_with_stripe_id;
  
  RAISE NOTICE 'Column stripe_price_id exists: %', column_exists;
  RAISE NOTICE 'Total products: %', products_count;
  RAISE NOTICE 'Products with stripe_price_id: %', products_with_stripe_id;
END $$;