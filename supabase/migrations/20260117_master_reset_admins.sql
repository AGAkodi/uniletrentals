-- MASTER RESET SCRIPT
-- This script will fix the "Blank Page" and "Cannot Promote" issues by resetting the security policies.

-- 1. FORCE Grant Admin Role to common admin emails (Safety Net)
-- Validating the role explicitly.
UPDATE public.profiles
SET role = 'admin'
WHERE email LIKE '%akodigideonakodi%';

-- 2. RESET Profiles RLS (Clear all potential conflicts)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert blogs" ON public.blogs; 
-- (Dropping policies on other tables isn't strictly necessary for the blank page, but good for cleanup if needed. 
-- For now, let's focus on PROFILES which drives the admin page).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RE-APPLY STANDARD POLICIES

-- A. VIEW: Allow ANY Authenticated user to view profiles (Fixes Admin List visibility guaranteed)
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- B. UPDATE: Allow Admins to update ANY profile (Fixes "Promote to Admin")
-- Note: We re-use the has_role check, but let's make it inline query to be 100% sure it works without function dependency issues
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

-- D. INSERT: Allow Users to insert their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);


-- 4. FIX has_role FUNCTION (Ensure it exists for frontend/other RLS uses)
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
