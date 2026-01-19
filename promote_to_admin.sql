-- ==========================================
-- PROMOTE TO ADMIN SCRIPT
-- Run this in your Supabase SQL Editor AFTER signing up
-- ==========================================

DO $$
DECLARE
  v_user_email TEXT := 'akodigideonakodi@gmail.com';
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User % NOT found. Please Sign Up on the website first!', v_user_email;
  ELSE
    -- 1. Update Profile Role
    UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id;
    
    -- 2. Update User Roles table
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- 3. Update Auth Metadata (optional but good for syncing)
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
    WHERE id = v_user_id;

    RAISE NOTICE '✅ User % promoted to ADMIN successfully.', v_user_email;
  END IF;
END $$;
