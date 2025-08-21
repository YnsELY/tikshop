/*
  # Fix profiles table RLS policies

  1. Security Updates
    - Drop existing RLS policies that may be using incorrect function names
    - Create new RLS policies with correct auth.uid() function
    - Ensure users can create, read, and update their own profiles

  2. Policy Details
    - INSERT: Allow authenticated users to create their own profile
    - SELECT: Allow authenticated users to read their own profile  
    - UPDATE: Allow authenticated users to update their own profile
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies with correct auth.uid() function
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;