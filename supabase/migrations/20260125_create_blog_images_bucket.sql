-- ==========================================
-- CREATE BLOG IMAGES BUCKET
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create 'blog-images' bucket (Public - so blog images can be viewed by anyone)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images', 
  'blog-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 2. RLS POLICIES FOR BLOG IMAGES

-- Allow public access to view blog images (anyone can see blog cover photos)
DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
CREATE POLICY "Blog images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'blog-images' );

-- Allow admins to upload blog images
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images' AND
    public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to update blog images
DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Admins can update blog images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-images' AND
    public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to delete blog images
DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Admins can delete blog images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-images' AND
    public.has_role(auth.uid(), 'admin')
  );
