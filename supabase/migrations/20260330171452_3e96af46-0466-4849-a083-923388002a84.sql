
-- Add active_skills to attendants for functional skill toggles
ALTER TABLE public.attendants ADD COLUMN IF NOT EXISTS active_skills text[] DEFAULT '{}';

-- Add human_takeover to conversations for handover feature
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS human_takeover boolean DEFAULT false;
