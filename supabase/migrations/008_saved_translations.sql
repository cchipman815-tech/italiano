-- Adds shared saved_translations table for persisting Quick Translate results.
-- Shared between all users (no user_id column).
-- Upsert on (english, italian) prevents duplicate entries.

CREATE TABLE IF NOT EXISTS saved_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  english text NOT NULL,
  italian text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_translations_pair_unique UNIQUE (english, italian)
);
