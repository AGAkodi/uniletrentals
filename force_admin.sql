-- ==========================================
-- FORCE ADMIN UPDATE SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

DO $$
DECLARE
  v_user_email TEXT := 'akodigideonakodi@gmail.com';
  v_user_id UUID;
  v_details RECORD;
BEGIN
  -- 1. Get User ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users', v_user_email;
  END IF;

  RAISE NOTICE 'Found User ID: %', v_user_id;

  -- 2. Force Update Profile
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE id = v_user_id;
  
  -- 3. Force Update/Insert User Role
  DELETE FROM public.user_roles WHERE user_id = v_user_id; -- Remove duplicates if any
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');

  -- 4. Update Auth Metadata
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{role}', 
    '"admin"'
  )
  WHERE id = v_user_id;

  -- 5. VERIFICATION
  RAISE NOTICE '=== VERIFICATION ===';
  
  FOR v_details IN 
    SELECT p.email, p.role as profile_role, ur.role as table_role, (u.raw_user_meta_data->>'role') as meta_role
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = v_user_id
  LOOP
    RAISE NOTICE 'Email: %', v_details.email;
    RAISE NOTICE 'Profile Role: %', v_details.profile_role;
    RAISE NOTICE 'UserRoles Table: %', v_details.table_role;
    RAISE NOTICE 'Auth Metadata: %', v_details.meta_role;
    
    IF v_details.profile_role = 'admin' AND v_details.table_role = 'admin' THEN
      RAISE NOTICE '✅ SUCCESS: User is now fully ADMIN.';
    ELSE
      RAISE NOTICE '❌ ERROR: User role mismatch!';
    END IF;
  END LOOP;

END $$;
