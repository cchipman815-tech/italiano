-- Add plural field to cards table
-- Stores Italian plural form, e.g. "libri" or "le mani"
ALTER TABLE cards ADD COLUMN IF NOT EXISTS plural text;
