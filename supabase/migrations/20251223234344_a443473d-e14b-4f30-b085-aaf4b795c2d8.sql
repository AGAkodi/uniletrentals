-- Add new columns to agent_verifications table for ZIP file support and rejection reason
ALTER TABLE public.agent_verifications 
ADD COLUMN IF NOT EXISTS zip_file_url text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Create notification trigger for when agent submits documents
CREATE OR REPLACE FUNCTION public.notify_admin_on_agent_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only trigger when documents are submitted (zip_file_url is set and verification_status is pending)
  IF NEW.zip_file_url IS NOT NULL AND (OLD.zip_file_url IS NULL OR NEW.zip_file_url != OLD.zip_file_url) THEN
    FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
      VALUES (admin_record.user_id, 'admin', 'verification', 'New Agent Verification Request', 
              'A new agent has submitted verification documents for review.', '/admin/verify-agents', false);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_agent_document_submission ON public.agent_verifications;
CREATE TRIGGER on_agent_document_submission
  AFTER UPDATE ON public.agent_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_agent_submission();

-- Create a trigger for when agent verification is approved or rejected
CREATE OR REPLACE FUNCTION public.notify_agent_on_verification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if verification status changed
  IF OLD.verification_status = 'pending' AND NEW.verification_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (NEW.user_id, 'agent', 'verification', 'Verification Approved!', 
            'Congratulations! Your agent account has been verified. Your Agent ID is ' || COALESCE(NEW.agent_id, 'N/A') || '. You can now list properties.',
            '/agent', false);
  ELSIF OLD.verification_status = 'pending' AND NEW.verification_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (NEW.user_id, 'agent', 'verification', 'Verification Rejected', 
            COALESCE('Your verification was rejected: ' || NEW.rejection_reason, 'Your verification was rejected. Please upload clearer documents and try again.'),
            '/agent/verification', false);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_agent_verification_status_change ON public.agent_verifications;
CREATE TRIGGER on_agent_verification_status_change
  AFTER UPDATE ON public.agent_verifications
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION public.notify_agent_on_verification_update();