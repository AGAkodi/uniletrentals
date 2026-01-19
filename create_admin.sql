-- ==========================================
-- CREATE ADMIN USER SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- IMPORTANT: This script inserts a user directly into auth.users.
-- It uses pgcrypto to hash the password.
-- The existing 'handle_new_user' trigger will automatically:
-- 1. Create a profile in public.profiles
-- 2. Assign the 'admin' role in public.user_roles

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  user_email TEXT := 'akodigideonakodi@gmail.com';
  user_password TEXT := '@Gid/Eon 408.##';
  user_meta_data JSONB := '{"role": "admin", "full_name": "Akodi Gideon"}';
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000', -- Default instance_id
      user_email,
      crypt(user_password, gen_salt('bf')), -- Hash password
      now(), -- Auto-confirm email
      '{"provider": "email", "providers": ["email"]}',
      user_meta_data,
      now(),
      now(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );

    RAISE NOTICE 'Admin user created successfully with ID: %', new_user_id;
  ELSE
    RAISE NOTICE 'User with email % already exists.', user_email;
    
    -- Optional: If user exists but isn't admin, update their role
    -- UPDATE auth.users SET raw_user_meta_data = user_meta_data WHERE email = user_email;
    -- UPDATE public.profiles SET role = 'admin' WHERE email = user_email;
    -- INSERT INTO public.user_roles (user_id, role) 
    --   SELECT id, 'admin' FROM auth.users WHERE email = user_email
    --   ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
