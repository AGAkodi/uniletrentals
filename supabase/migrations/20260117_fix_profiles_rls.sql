-- Ensure admins can view all profiles
-- This is needed for the "Manage Admins" page to list all administrators

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (
        public.has_role(auth.uid(), 'admin'::public.user_role) 
        OR 
        (permissions @> ARRAY['manage_admins']) -- Also allow if they have specific permission
        OR
        (permissions @> ARRAY['super_admin'])
    );

-- Also ensure public can view basic profile info if needed, but for now focus on Admin access.
-- Standard starter kits often have "Public profiles are viewable by everyone" but we enforce it here for admins just in case.
