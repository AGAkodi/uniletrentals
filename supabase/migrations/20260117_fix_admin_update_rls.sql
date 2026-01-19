-- FIX: Allow Admins to UPDATE profiles (to change roles) and INSERT user_roles

-- 1. Profiles Table: Allow Admins to UPDATE others
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    );

-- 2. User Roles Table: Ensure RLS is enabled and Admins can Manage it
-- (First create the table if it doesn't exist just in case, though it likely does)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

CREATE POLICY "Admins can manage user_roles" ON public.user_roles
    FOR ALL -- SELECT, INSERT, UPDATE, DELETE
    USING (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.user_role)
    );

-- 3. Also allow basic SELECT on user_roles for the user themselves (if needed)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT
    USING (
        auth.uid() = user_id
    );
