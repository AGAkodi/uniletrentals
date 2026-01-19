-- ==========================================
-- FIX PROPERTY BUCKET SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create 'property-images' bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. RLS POLICIES FOR PROPERTY IMAGES

-- Allow public access to view property images
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

-- Allow agents to delete their own property images
DROP POLICY IF EXISTS "Agents can delete own property images" ON storage.objects;
CREATE POLICY "Agents can delete own property images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
