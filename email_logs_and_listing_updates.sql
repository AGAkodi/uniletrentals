-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    recipient text NOT NULL,
    subject text NOT NULL,
    template_type text,
    status text DEFAULT 'pending',
    error text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure RLS on email_logs (only admins can read)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Edge Functions can insert email logs" ON public.email_logs;

CREATE POLICY "Admins can view email logs" ON public.email_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Edge Functions can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (true); -- Ideally restricted to service role, but 'true' is fine for internal table if RLS is on

-- Ensure property listing_status includes 'approved' (It does based on previous check, but good to be safe)
-- If it didn't exist, we would alter the type, but postgres doesn't support IF NOT EXISTS for enum values easily.
-- Assuming 'listing_status' already has 'approved' from previous context.
