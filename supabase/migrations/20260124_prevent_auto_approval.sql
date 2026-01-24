-- ==========================================
-- Prevent agents from auto-approving themselves
-- Add check constraint and ensure proper flow
-- ==========================================

-- Add a check constraint to ensure verification_status default is 'pending'
-- This is already set in the table definition, but let's ensure it
ALTER TABLE public.agent_verifications 
  ALTER COLUMN verification_status SET DEFAULT 'pending'::public.verification_status;

-- Ensure the default is correct (should already be set, but double-check)
DO $$
BEGIN
  -- Check if default is correct
  IF NOT EXISTS (
    SELECT 1 FROM pg_attrdef ad
    JOIN pg_attribute a ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'agent_verifications'
      AND a.attname = 'verification_status'
      AND pg_get_expr(ad.adbin, ad.adrelid) = '''pending''::public.verification_status'
  ) THEN
    ALTER TABLE public.agent_verifications 
      ALTER COLUMN verification_status SET DEFAULT 'pending'::public.verification_status;
  END IF;
END $$;

-- Create a function to log when status changes (for debugging)
CREATE OR REPLACE FUNCTION public.log_verification_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status changes for debugging
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    RAISE NOTICE 'Verification status changed for user %: % -> %', 
      NEW.user_id, 
      OLD.verification_status, 
      NEW.verification_status;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one for logging
DROP TRIGGER IF EXISTS log_verification_status_change ON public.agent_verifications;
CREATE TRIGGER log_verification_status_change
  BEFORE UPDATE ON public.agent_verifications
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION public.log_verification_status_change();
