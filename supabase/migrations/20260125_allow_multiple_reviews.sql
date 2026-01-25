-- ==========================================
-- REVIEW CONSTRAINTS: One review per property, multiple across properties
-- A student can review an agent once per property
-- but can review the same agent on different properties
-- ==========================================

-- Drop any existing unique constraints on user_id + agent_id only (too restrictive)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_agent_id_key;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_agent_unique;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS unique_user_agent_review;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_unique_user_agent;

-- Drop any unique index on just user_id + agent_id
DROP INDEX IF EXISTS reviews_user_id_agent_id_idx;
DROP INDEX IF EXISTS reviews_user_agent_unique_idx;
DROP INDEX IF EXISTS idx_reviews_user_agent;

-- Add unique constraint on (user_id, agent_id, property_id)
-- This allows one review per user per agent per property
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_agent_property_unique;
ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_user_agent_property_unique 
  UNIQUE (user_id, agent_id, property_id);

-- Add indexes for faster aggregate queries
CREATE INDEX IF NOT EXISTS idx_reviews_agent_id ON public.reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON public.reviews(property_id);

-- Ensure RLS allows students to create reviews
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure RLS allows viewing all reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
