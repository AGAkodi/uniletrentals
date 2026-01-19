-- MASTER RESET SCRIPT V3 (Guaranteed Fix)
-- This script explicitly drops all variations of conflicting policies.

-- 1. FORCE Grant Admin Role
UPDATE public.profiles
SET role = 'admin'
WHERE email LIKE '%akodigideonakodi%';

-- 2. CLEAR OLD POLICIES (Aggressive Cleanup)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop every known variation of these policies to be safe
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;  -- <--- The one causing your error
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RE-CREATE POLICIES (Clean Slate)

-- A. VIEW: Allow ANY Authenticated user to view profiles
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- B. UPDATE: Allow Admins to update ANY profile
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- C. UPDATE: Allow Users to update THEIR OWN profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- D. INSERT: Allow Users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);


-- 4. ENSURE HELPER FUNCTION EXISTS
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
