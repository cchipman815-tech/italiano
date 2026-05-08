-- Add conjugations (JSONB, nullable — only verb cards use this)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS conjugations JSONB;

-- Add enabled toggle (default true — all existing cards stay active)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
