-- ==========================================
-- FIX AGENT VERIFICATION VISIBILITY
-- Allow anyone to view approved agent verifications
-- so students can see agent IDs and verified status
-- ==========================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Agents can view own verification" ON public.agent_verifications;

-- Allow agents to view their own verification (any status)
CREATE POLICY "Agents can view own verification"
  ON public.agent_verifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow anyone to view APPROVED agent verifications (for public display)
DROP POLICY IF EXISTS "Anyone can view approved verifications" ON public.agent_verifications;
CREATE POLICY "Anyone can view approved verifications"
  ON public.agent_verifications
  FOR SELECT
  USING (verification_status = 'approved');

-- Admins can view all verifications
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.agent_verifications;
CREATE POLICY "Admins can view all verifications"
  ON public.agent_verifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Ensure RLS is enabled
ALTER TABLE public.agent_verifications ENABLE ROW LEVEL SECURITY;
