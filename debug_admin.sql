-- ==========================================
-- DEBUG ADMIN SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

DO $$
DECLARE
  v_user_email TEXT := 'akodigideonakodi@gmail.com';
  v_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- 1. Check if user exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User % NOT found in auth.users. Please run create_admin.sql again.', v_user_email;
  ELSE
    RAISE NOTICE '✅ User found in auth.users with ID: %', v_user_id;
    
    -- 2. Check if profile exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;
    
    IF v_profile_exists THEN
      RAISE NOTICE '✅ Profile found in public.profiles.';
      
      -- Check role
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin') THEN
        RAISE NOTICE '✅ Profile has correct role: admin';
      ELSE
        RAISE NOTICE '⚠️ Profile found but role is NOT admin. Updating...';
        UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
        RAISE NOTICE '✅ Role updated to admin.';
      END IF;
      
    ELSE
      RAISE NOTICE '❌ Profile NOT found in public.profiles. Trigger likely failed.';
      RAISE NOTICE '🛠️ Attempting manual fix...';
      
      INSERT INTO public.profiles (id, full_name, email, role)
      VALUES (v_user_id, 'Akodi Gideon', v_user_email, 'admin');
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin');
      
      RAISE NOTICE '✅ Manual fix applied. Profile and User Role created.';
    END IF;
    
  END IF;
END $$;
