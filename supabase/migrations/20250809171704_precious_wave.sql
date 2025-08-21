/*
  # Add stripe_price_id column to products table

  1. New Columns
    - `stripe_price_id` (text, nullable) - Stores the Stripe Price ID for direct checkout

  2. Purpose
    - Enables Stripe payments for products created via admin panel
    - Links Supabase products to their corresponding Stripe prices
    - Allows automatic detection of Stripe-compatible products

  3. Notes
    - Column is nullable to support products not yet synchronized with Stripe
    - Will be populated automatically during Stripe synchronization
*/

-- Add the stripe_price_id column to the products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT DEFAULT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN products.stripe_price_id IS 'Stripe Price ID for the product, used for direct checkout integration';

-- Create an index for better performance when querying by stripe_price_id
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_id ON products(stripe_price_id);