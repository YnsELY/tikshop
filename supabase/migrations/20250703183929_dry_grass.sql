/*
  # Create user registration trigger

  1. New Functions
    - `handle_new_user()` - Automatically creates a profile when a new user registers
  
  2. New Triggers
    - `on_auth_user_created` - Executes the handle_new_user function after user creation
  
  3. Security
    - Ensures the trigger can bypass RLS to create profiles
    - Uses the user's metadata to populate profile fields
*/

-- Create the trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    address,
    city,
    postal_code,
    country,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    '',
    '',
    '',
    'France',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires after a new user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();