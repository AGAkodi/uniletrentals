-- Add contact_clicks column to properties table to track contact button clicks
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS contact_clicks integer DEFAULT 0;