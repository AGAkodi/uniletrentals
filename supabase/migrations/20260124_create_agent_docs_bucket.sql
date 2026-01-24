-- ==========================================
-- Create agent-docs storage bucket and policies
-- ==========================================

-- Create 'agent-docs' bucket (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-docs', 'agent-docs', false, 52428800, ARRAY['application/zip', 'application/x-zip-compressed'])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/zip', 'application/x-zip-compressed'];

-- ==========================================
-- RLS POLICIES FOR AGENT DOCS
-- ==========================================

-- Allow agents to upload their own documents
-- Path convention: {user_id}/verification-{timestamp}.zip
DROP POLICY IF EXISTS "Agents can upload verification docs" ON storage.objects;
CREATE POLICY "Agents can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    public.has_role(auth.uid(), 'agent')
  );

-- Allow agents to view their own documents
DROP POLICY IF EXISTS "Agents can view own verification docs" ON storage.objects;
CREATE POLICY "Agents can view own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    public.has_role(auth.uid(), 'agent')
  );

-- Allow agents to update their own documents (for resubmission)
DROP POLICY IF EXISTS "Agents can update own verification docs" ON storage.objects;
CREATE POLICY "Agents can update own verification docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    public.has_role(auth.uid(), 'agent')
  );

-- Allow admins to view all documents
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;
CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-docs' AND
    public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to delete documents (for cleanup)
DROP POLICY IF EXISTS "Admins can delete verification docs" ON storage.objects;
CREATE POLICY "Admins can delete verification docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agent-docs' AND
    public.has_role(auth.uid(), 'admin')
  );
