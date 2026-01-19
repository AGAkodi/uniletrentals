-- ==========================================
-- FIX BUCKETS SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create 'avatars' bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create 'agent-docs' bucket (Private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-docs', 'agent-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==========================================
-- RLS POLICIES FOR AVATARS
-- ==========================================

-- Allow public access to avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Allow users to upload their own avatar
-- Path convention: {user_id}/avatar.png
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==========================================
-- RLS POLICIES FOR AGENT DOCS
-- ==========================================

-- Allow agents to upload their own documents
DROP POLICY IF EXISTS "Agents can upload verification docs" ON storage.objects;
CREATE POLICY "Agents can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow agents to view their own documents
DROP POLICY IF EXISTS "Agents can view own verification docs" ON storage.objects;
CREATE POLICY "Agents can view own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow admins to view all documents
-- Note: Requires public.has_role function to exist (from fresh_db_setup.sql)
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;
CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-docs' AND
    (
       -- If public.has_role exists, use it
       (SELECT count(*) FROM pg_proc WHERE proname = 'has_role') > 0 
       AND public.has_role(auth.uid(), 'admin')
    )
  );
