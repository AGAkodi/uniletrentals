-- ==========================================
-- Reset incorrectly approved agents and prevent auto-approval
-- ==========================================

-- Reset any agents that were incorrectly auto-approved (no verified_by means agent set it)
UPDATE public.agent_verifications
SET 
  verification_status = 'pending',
  agent_id = NULL,
  verified_by = NULL,
  verified_at = NULL
WHERE verification_status = 'approved' 
  AND verified_by IS NULL
  AND zip_file_url IS NOT NULL; -- Only reset if they have documents (means they uploaded)

-- Ensure default is 'pending'
ALTER TABLE public.agent_verifications 
  ALTER COLUMN verification_status SET DEFAULT 'pending'::public.verification_status;
