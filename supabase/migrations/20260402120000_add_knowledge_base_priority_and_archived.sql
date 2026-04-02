-- Add source_priority and is_archived columns to knowledge_base
-- source_priority: numeric priority for RAG retrieval ordering (higher = more relevant)
-- is_archived: soft-delete flag for hiding chunks without losing data

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS source_priority integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Index for the fallback query used by chat and whatsapp-webhook
CREATE INDEX IF NOT EXISTS idx_knowledge_base_priority
  ON knowledge_base (attendant_id, is_archived, source_priority DESC, created_at DESC);

-- Backfill existing rows based on source_type
UPDATE knowledge_base SET source_priority = 100 WHERE source_type = 'document';
UPDATE knowledge_base SET source_priority = 90  WHERE source_type = 'manual';
UPDATE knowledge_base SET source_priority = 70  WHERE source_type = 'website';
UPDATE knowledge_base SET source_priority = 10  WHERE source_type = 'social';
