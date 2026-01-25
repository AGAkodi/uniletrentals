-- ==========================================
-- FIX BLOGS RLS POLICIES
-- Allows admins to manage blog posts
-- ==========================================

-- Drop all existing blog policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert blogs" ON public.blogs;
DROP POLICY IF EXISTS "Admins can update blogs" ON public.blogs;
DROP POLICY IF EXISTS "Admins can delete blogs" ON public.blogs;
DROP POLICY IF EXISTS "Admins can view all blogs" ON public.blogs;
DROP POLICY IF EXISTS "Anyone can view published blogs" ON public.blogs;
DROP POLICY IF EXISTS "Public can view published blogs" ON public.blogs;

-- Allow anyone to view published blogs, admins can view all
CREATE POLICY "Anyone can view published blogs"
  ON public.blogs
  FOR SELECT
  USING (
    published = true OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to insert blogs (simple role check, no extra permissions needed)
CREATE POLICY "Admins can insert blogs"
  ON public.blogs
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to update blogs
CREATE POLICY "Admins can update blogs"
  ON public.blogs
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to delete blogs
CREATE POLICY "Admins can delete blogs"
  ON public.blogs
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Ensure RLS is enabled
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
