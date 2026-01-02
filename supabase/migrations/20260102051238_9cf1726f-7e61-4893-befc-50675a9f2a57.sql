-- Add religion_preference column to shared_rentals
ALTER TABLE public.shared_rentals 
ADD COLUMN religion_preference TEXT CHECK (religion_preference IN ('any', 'christian', 'muslim', 'other'))
DEFAULT 'any';