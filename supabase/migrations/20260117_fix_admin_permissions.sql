-- update existing admins to have super_admin permission
-- This ensures that when we switch the logic to "Empty = No Access", existing admins don't get locked out.

UPDATE public.profiles
SET permissions = '{super_admin}'
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '{}');
