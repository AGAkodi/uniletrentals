-- Fix bookings RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and agents can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Agents can delete bookings" ON public.bookings;

-- Recreate policies with proper role checks

-- Students can create bookings
CREATE POLICY "Students can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.has_role(auth.uid(), 'student')
);

-- Users and agents can view their own bookings
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = agent_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Users and agents can update bookings
CREATE POLICY "Users and agents can update bookings"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR auth.uid() = agent_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Agents and admins can delete bookings
CREATE POLICY "Agents can delete bookings"
ON public.bookings
FOR DELETE
USING (
  auth.uid() = agent_id 
  OR public.has_role(auth.uid(), 'admin')
);
