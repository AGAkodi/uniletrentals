-- Revert RLS Policies to standard admin check (remove granular permissions)

-- 1. Blogs
DROP POLICY IF EXISTS "Admins can insert blogs" ON public.blogs;
CREATE POLICY "Admins can insert blogs" ON public.blogs
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can update blogs" ON public.blogs;
CREATE POLICY "Admins can update blogs" ON public.blogs
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can delete blogs" ON public.blogs;
CREATE POLICY "Admins can delete blogs" ON public.blogs
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 2. Profiles (Revert to standard view)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
-- (Assuming the standard policy was allowed or we just leave it cleaner)
-- Let's recreate the standard one just in case
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.user_role));
