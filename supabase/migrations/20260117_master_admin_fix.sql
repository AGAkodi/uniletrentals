-- MASTER FIX SCRIPT: Run this to fix "No Admins Found" and "Permissions" issues

-- 1. Ensure 'permissions' column exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- 2. Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.has_role(uuid, public.user_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(uuid, text) CASCADE;

-- 3. Recreate Helper Functions
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

CREATE OR REPLACE FUNCTION public.has_permission(user_id uuid, required_permission text)
RETURNS boolean AS $$
DECLARE
    user_permissions text[];
BEGIN
    SELECT permissions INTO user_permissions
    FROM public.profiles
    WHERE id = user_id;

    IF required_permission = 'any' THEN
        RETURN TRUE;
    END IF;
    
    -- Super Admin check
    IF user_permissions IS NOT NULL AND 'super_admin' = ANY(user_permissions) THEN
        RETURN TRUE;
    END IF;

    IF user_permissions IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FIX RLS POLICIES (Visibility & Update)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow Admins to VIEW all profiles (Fixes "No administrators found")
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Allow Admins to UPDATE profiles (Fixes "Promote to Admin")
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.user_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 5. Grant Super Admin to your main account (Optional safety)
UPDATE public.profiles
SET permissions = array_append(permissions, 'super_admin')
WHERE email LIKE '%akodigideonakodi%' 
AND NOT (permissions @> ARRAY['super_admin']);
