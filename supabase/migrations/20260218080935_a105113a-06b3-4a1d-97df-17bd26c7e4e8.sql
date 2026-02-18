-- Add location and experience_keywords to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS experience_keywords text[] DEFAULT '{}';
