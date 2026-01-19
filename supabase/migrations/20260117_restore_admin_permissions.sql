-- Re-apply permissions column and function if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.has_permission(user_id uuid, required_permission text)
RETURNS boolean AS $$
DECLARE
    user_permissions text[];
    user_role public.user_role;
BEGIN
    SELECT role, permissions INTO user_role, user_permissions
    FROM public.profiles
    WHERE id = user_id;

    IF required_permission = 'any' THEN
        RETURN TRUE;
    END IF;
    
    -- Super Admin check
    IF 'super_admin' = ANY(user_permissions) THEN
        RETURN TRUE;
    END IF;

    RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS Policies
-- Blogs coverage
DROP POLICY IF EXISTS "Admins can insert blogs" ON public.blogs;
CREATE POLICY "Admins can insert blogs" ON public.blogs
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.user_role) AND 
        public.has_permission(auth.uid(), 'manage_blogs')
    );

DROP POLICY IF EXISTS "Admins can update blogs" ON public.blogs;
CREATE POLICY "Admins can update blogs" ON public.blogs
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'admin'::public.user_role) AND 
        public.has_permission(auth.uid(), 'manage_blogs')
    );

DROP POLICY IF EXISTS "Admins can delete blogs" ON public.blogs;
CREATE POLICY "Admins can delete blogs" ON public.blogs
    FOR DELETE USING (
        public.has_role(auth.uid(), 'admin'::public.user_role) AND 
        public.has_permission(auth.uid(), 'manage_blogs')
    );

-- Profiles visibility (Admins viewing Admins)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    );
