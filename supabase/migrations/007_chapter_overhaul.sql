-- 007_chapter_overhaul.sql
-- Adds richer card metadata columns and the sentences table for Sentence Practice.

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS chapter         integer,
  ADD COLUMN IF NOT EXISTS article         text,
  ADD COLUMN IF NOT EXISTS word_type       text,
  ADD COLUMN IF NOT EXISTS adjective_forms jsonb,
  ADD COLUMN IF NOT EXISTS tense           text DEFAULT 'present';

CREATE TABLE IF NOT EXISTS sentences (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid        REFERENCES cards(id) ON DELETE CASCADE,
  set_id      uuid        REFERENCES sets(id)  ON DELETE CASCADE,
  italian     text        NOT NULL,
  english     text        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('example', 'fill_blank', 'dialogue', 'translation')),
  chapter     integer,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sentences_card_id_idx ON sentences(card_id);
CREATE INDEX IF NOT EXISTS sentences_set_id_idx  ON sentences(set_id);
CREATE INDEX IF NOT EXISTS sentences_type_idx    ON sentences(type);
