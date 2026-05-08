-- Add gender field to cards table
-- Values: 'm' (masculine), 'f' (feminine), null (unknown/not applicable)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('m', 'f'));
