-- Create trigger function to create agent_verification record for new agents
CREATE OR REPLACE FUNCTION public.handle_new_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an agent (from the user_roles table which was just inserted)
  IF NEW.role = 'agent' THEN
    -- Insert verification record if it doesn't exist
    INSERT INTO public.agent_verifications (user_id, verification_status)
    VALUES (NEW.user_id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table (which is populated when users sign up)
DROP TRIGGER IF EXISTS on_agent_role_created ON public.user_roles;
CREATE TRIGGER on_agent_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_agent();

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_verifications_user_id_key'
  ) THEN
    ALTER TABLE public.agent_verifications ADD CONSTRAINT agent_verifications_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Create verification records for existing agents who don't have one
INSERT INTO public.agent_verifications (user_id, verification_status)
SELECT ur.user_id, 'pending'
FROM public.user_roles ur
WHERE ur.role = 'agent'
AND NOT EXISTS (
  SELECT 1 FROM public.agent_verifications av WHERE av.user_id = ur.user_id
);