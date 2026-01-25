-- ==========================================
-- FIX SHARED RENTALS RLS POLICIES
-- Allows students to create shared rental listings
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Verified students can create shared rentals" ON public.shared_rentals;
DROP POLICY IF EXISTS "Anyone can view active shared rentals" ON public.shared_rentals;
DROP POLICY IF EXISTS "Host students can update own shared rentals" ON public.shared_rentals;
DROP POLICY IF EXISTS "Host students and admins can delete shared rentals" ON public.shared_rentals;

-- Allow anyone to view active shared rentals (or their own, or admins see all)
CREATE POLICY "Anyone can view active shared rentals"
  ON public.shared_rentals
  FOR SELECT
  USING (
    status = 'active' OR 
    auth.uid() = host_student_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Allow students to create shared rentals
CREATE POLICY "Students can create shared rentals"
  ON public.shared_rentals
  FOR INSERT
  WITH CHECK (
    auth.uid() = host_student_id AND
    public.has_role(auth.uid(), 'student')
  );

-- Allow host students to update their own shared rentals
CREATE POLICY "Host students can update own shared rentals"
  ON public.shared_rentals
  FOR UPDATE
  USING (
    auth.uid() = host_student_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Allow host students and admins to delete shared rentals
CREATE POLICY "Host students and admins can delete shared rentals"
  ON public.shared_rentals
  FOR DELETE
  USING (
    auth.uid() = host_student_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Ensure RLS is enabled
ALTER TABLE public.shared_rentals ENABLE ROW LEVEL SECURITY;
