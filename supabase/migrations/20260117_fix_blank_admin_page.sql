-- RESCUE SCRIPT: Fix Blank Manage Admins Page
-- This restores the critical "View" policy that makes the list visible.

-- 1. Ensure the helper function exists (in case it was dropped)
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

-- 2. RESET Policy for Viewing Profiles (The reason the page is blank)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    );

-- 3. RESET Policy for Updating Profiles (So you can fix roles if needed)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    );
