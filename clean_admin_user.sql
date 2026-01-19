-- ==========================================
-- CLEAN ADMIN USER SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

DO $$
DECLARE
  v_user_email TEXT := 'akodigideonakodi@gmail.com';
BEGIN
  -- Delete from auth.users (cascades to profiles)
  DELETE FROM auth.users WHERE email = v_user_email;
  
  RAISE NOTICE '✅ User % deleted. You can now sign up normally.', v_user_email;
END $$;
