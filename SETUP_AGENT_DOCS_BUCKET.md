# Setup Agent Docs Storage Bucket

If you're getting the error "Storage bucket not configured, contact support" when trying to upload agent verification documents, you need to create the storage bucket and set up the required policies.

## Quick Fix

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create 'agent-docs' bucket (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-docs', 'agent-docs', false, 52428800, ARRAY['application/zip', 'application/x-zip-compressed'])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/zip', 'application/x-zip-compressed'];

-- RLS Policies for Agent Docs
DROP POLICY IF EXISTS "Agents can upload verification docs" ON storage.objects;
CREATE POLICY "Agents can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    public.has_role(auth.uid(), 'agent')
  );

DROP POLICY IF EXISTS "Agents can view own verification docs" ON storage.objects;
CREATE POLICY "Agents can view own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    public.has_role(auth.uid(), 'agent')
  );

DROP POLICY IF EXISTS "Agents can update own verification docs" ON storage.objects;
CREATE POLICY "Agents can update own verification docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agent-docs' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    public.has_role(auth.uid(), 'agent')
  );

DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;
CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-docs' AND
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete verification docs" ON storage.objects;
CREATE POLICY "Admins can delete verification docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agent-docs' AND
    public.has_role(auth.uid(), 'admin')
  );
```

## Steps

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL above
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify the bucket was created by going to **Storage** → **Buckets** and checking for `agent-docs`

## Alternative: Use Migration File

If you're using Supabase CLI, you can apply the migration:

```bash
supabase migration up
```

Or manually run the migration file:
- File: `supabase/migrations/20260124_create_agent_docs_bucket.sql`

## Verification

After running the SQL, try uploading agent verification documents again. The error should be resolved.

## Troubleshooting

If you still get errors:
1. Ensure you're logged in as an agent (check your role in the `profiles` table)
2. Verify the bucket exists in Storage → Buckets
3. Check that RLS policies are active (they should be by default)
4. Ensure the `has_role()` function exists (from `fresh_db_setup.sql`)
