-- CORRECTED FIX: Drop function first to avoid parameter name conflict

-- 1. Drop the existing function first (fixing the error you saw)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.user_role) CASCADE;

-- 2. Recreate the function ensuring correct parameter names
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, required_role public.user_role)
RETURNS boolean AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-apply the RLS policy for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    );
