-- Add example field to cards table
-- Shape: { "italian": "Ho una casa grande.", "english": "I have a big house." }
ALTER TABLE cards ADD COLUMN IF NOT EXISTS example jsonb;
