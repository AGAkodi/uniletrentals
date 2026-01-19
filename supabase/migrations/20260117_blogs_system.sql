-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    content text NOT NULL,
    excerpt text,
    cover_image text,
    author_id uuid REFERENCES public.profiles(id),
    published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view published blogs" ON public.blogs
    FOR SELECT USING (published = true);

CREATE POLICY "Admins can view all blogs" ON public.blogs
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can insert blogs" ON public.blogs
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can update blogs" ON public.blogs
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can delete blogs" ON public.blogs
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Storage for Blog Images
-- Note: Bucket creation usually happens via API/Dashboard, but we can try to insert if the storage schema is accessible.
-- For now, we assume the 'public' bucket or a specific 'blog-images' bucket exists or we user the existing 'property-images' as a pattern.
-- Let's stick to creating the table first. Storage setup usually requires manual dashboard step or specific SQL if storage schema is exposed.
