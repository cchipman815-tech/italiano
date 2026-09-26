-- 009_saved_translations_user.sql
-- Saved translations become per-user. Every existing row is copied to both
-- users so nobody loses anything.
--
-- Ships with the per-user saved-translations API. Run it right before that
-- deploy: the old API inserts without user_id and upserts on
-- (english, italian), which both fail once this runs; the new API fails
-- until it has.

BEGIN;

ALTER TABLE saved_translations
  ADD COLUMN IF NOT EXISTS user_id integer REFERENCES users(id);

-- The old pair constraint would block the copies below.
ALTER TABLE saved_translations
  DROP CONSTRAINT IF EXISTS saved_translations_pair_unique;

-- Copy each unowned row to Jennifer, then give the originals to Chance.
INSERT INTO saved_translations (english, italian, created_at, user_id)
SELECT english, italian, created_at, 2
FROM saved_translations
WHERE user_id IS NULL;

UPDATE saved_translations SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE saved_translations ALTER COLUMN user_id SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_translations_user_pair_unique') THEN
    ALTER TABLE saved_translations
      ADD CONSTRAINT saved_translations_user_pair_unique UNIQUE (user_id, english, italian);
  END IF;
END $$;

-- Salvate lists one user's rows, newest first.
CREATE INDEX IF NOT EXISTS saved_translations_user_created_idx
  ON saved_translations (user_id, created_at DESC);

COMMIT;
