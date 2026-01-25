-- ==========================================
-- SETUP PROPERTY IMAGES BUCKET
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create 'property-images' bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images', 
  'property-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 2. RLS POLICIES FOR PROPERTY IMAGES

-- Allow public access to view property images (anyone can see listing photos)
DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
CREATE POLICY "Property images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'property-images' );

-- Allow agents to upload property images
-- Path convention: {agent_id}/{timestamp}-{random}.{ext}
DROP POLICY IF EXISTS "Agents can upload property images" ON storage.objects;
CREATE POLICY "Agents can upload property images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow agents to update their own property images
DROP POLICY IF EXISTS "Agents can update own property images" ON storage.objects;
CREATE POLICY "Agents can update own property images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow agents to delete their own property images
DROP POLICY IF EXISTS "Agents can delete own property images" ON storage.objects;
CREATE POLICY "Agents can delete own property images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow admins to manage all property images
DROP POLICY IF EXISTS "Admins can manage property images" ON storage.objects;
CREATE POLICY "Admins can manage property images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'property-images' AND
    public.has_role(auth.uid(), 'admin')
  );
