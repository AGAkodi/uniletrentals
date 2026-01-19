-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    agent_id uuid REFERENCES public.profiles(id) NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    reporter_id uuid REFERENCES public.profiles(id) NOT NULL,
    reported_agent_id uuid REFERENCES public.profiles(id),
    reported_property_id uuid REFERENCES public.properties(id),
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending' NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;

-- Policies for Reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for Reports
CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can update reports" ON public.reports
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Authenticated users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
