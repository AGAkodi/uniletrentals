-- ==========================================
-- UPDATE LISTING STATUS ENUM SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- Add 'unavailable' to the listing_status enum
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'unavailable';
