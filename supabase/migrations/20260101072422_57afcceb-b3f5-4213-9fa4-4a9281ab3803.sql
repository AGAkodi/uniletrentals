-- Drop the trigger if it exists to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, email, phone, role, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student'),
    NEW.raw_user_meta_data ->> 'student_id'
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also manually insert the missing profile for the agent who just signed up
INSERT INTO public.profiles (id, full_name, email, phone, role)
VALUES (
  '76c6e10e-eac5-4cb7-af72-863355208614',
  'king Gideon',
  'gideonking@gmail.com',
  '09089786545',
  'agent'
)
ON CONFLICT (id) DO NOTHING;

-- And add to user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('76c6e10e-eac5-4cb7-af72-863355208614', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;