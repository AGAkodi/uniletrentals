-- ==========================================
-- Fix RLS policies for agent_verifications to support UPSERT
-- IMPORTANT: Agents can ONLY set status to 'pending'. Only admins can approve.
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Agents can insert own verification" ON public.agent_verifications;
DROP POLICY IF EXISTS "Agents can update own verification" ON public.agent_verifications;

-- Recreate INSERT policy with proper WITH CHECK clause
-- This allows agents to insert their own verification record
-- But they can ONLY set status to 'pending' (not 'approved')
CREATE POLICY "Agents can insert own verification"
  ON public.agent_verifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.has_role(auth.uid(), 'agent') AND
    -- Agents can ONLY insert with 'pending' status (or NULL which defaults to pending)
    (verification_status IS NULL OR verification_status = 'pending') AND
    -- Agents CANNOT set these fields (only admins can)
    agent_id IS NULL AND
    verified_by IS NULL AND
    verified_at IS NULL
  );

-- Recreate UPDATE policy with both USING and WITH CHECK clauses
-- Agents can update their own verification but CANNOT approve themselves
-- Note: In WITH CHECK, reference columns directly (no NEW. prefix)
CREATE POLICY "Agents can update own verification"
  ON public.agent_verifications
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    public.has_role(auth.uid(), 'agent')
  )
  WITH CHECK (
    auth.uid() = user_id AND
    public.has_role(auth.uid(), 'agent') AND
    -- CRITICAL: Agents CANNOT set status to 'approved' (only admins can)
    -- They can set it to 'pending' (for new submissions or resubmissions)
    -- They can also set it to 'rejected' if admin rejected them (though this shouldn't happen)
    -- But they CANNOT set it to 'approved'
    verification_status != 'approved' AND
    -- Prevent agents from setting agent_id (only admins can do this)
    agent_id IS NULL AND
    -- Prevent agents from setting verified_by (only admins can do this)
    verified_by IS NULL AND
    -- Prevent agents from setting verified_at (only admins can do this)
    verified_at IS NULL
  );

-- Ensure SELECT policy exists (should already exist, but ensure it's correct)
DROP POLICY IF EXISTS "Agents can view own verification" ON public.agent_verifications;
CREATE POLICY "Agents can view own verification"
  ON public.agent_verifications
  FOR SELECT
  USING (
    (auth.uid() = user_id AND public.has_role(auth.uid(), 'agent')) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Ensure admins can do everything
DROP POLICY IF EXISTS "Admins can manage verifications" ON public.agent_verifications;
CREATE POLICY "Admins can manage verifications"
  ON public.agent_verifications
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
