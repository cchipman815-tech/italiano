-- Add spaced repetition fields to progress table
-- Based on a simplified SM-2 algorithm
ALTER TABLE progress
  ADD COLUMN IF NOT EXISTS interval integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ease_factor float NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS repetitions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_at date;
