-- ==========================================
-- FIX PROPERTIES RLS POLICIES
-- Allows verified agents to insert approved properties
-- ==========================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Agents can insert properties" ON public.properties;

-- Create new INSERT policy that allows verified agents to insert with any status
-- Verified agents can insert properties directly as 'approved'
CREATE POLICY "Agents can insert properties"
  ON public.properties
  FOR INSERT
  WITH CHECK (
    auth.uid() = agent_id AND
    public.has_role(auth.uid(), 'agent')
  );

-- Ensure the UPDATE policy allows agents to update their own properties
DROP POLICY IF EXISTS "Agents can update own properties" ON public.properties;
CREATE POLICY "Agents can update own properties"
  ON public.properties
  FOR UPDATE
  USING (
    auth.uid() = agent_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Ensure SELECT policy exists for viewing properties
DROP POLICY IF EXISTS "Anyone can view approved properties" ON public.properties;
CREATE POLICY "Anyone can view approved properties"
  ON public.properties
  FOR SELECT
  USING (
    status = 'approved' OR 
    auth.uid() = agent_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Ensure DELETE policy for admins
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;
CREATE POLICY "Admins can delete properties"
  ON public.properties
  FOR DELETE
  USING (
    auth.uid() = agent_id OR
    public.has_role(auth.uid(), 'admin')
  );

-- Verify RLS is enabled
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
