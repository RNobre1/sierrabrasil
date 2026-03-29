
-- Add username and username_changed_at to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS username_changed_at timestamp with time zone;

-- Create index for fast username lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);
