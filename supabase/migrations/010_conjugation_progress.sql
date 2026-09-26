-- 010_conjugation_progress.sql
-- SRS progress for individual conjugation forms (verb × tense × pronoun).
-- ConjugationStudy builds its items from cards.conjugations, so a form has
-- no card of its own; progress is keyed on the verb card plus the form.
-- Same SRS columns as progress (003_srs.sql).

CREATE TABLE IF NOT EXISTS conjugation_progress (
  user_id        integer     NOT NULL REFERENCES users(id),
  card_id        uuid        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tense          text        NOT NULL DEFAULT 'present',
  pronoun        text        NOT NULL CHECK (pronoun IN ('io', 'tu', 'lui/lei', 'noi', 'voi', 'loro')),
  known          boolean     NOT NULL DEFAULT false,
  interval       integer     NOT NULL DEFAULT 1,
  ease_factor    float       NOT NULL DEFAULT 2.5,
  repetitions    integer     NOT NULL DEFAULT 0,
  next_review_at date,
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conjugation_progress_form_unique UNIQUE (user_id, card_id, tense, pronoun)
);

-- Oggi counts each user's due forms.
CREATE INDEX IF NOT EXISTS conjugation_progress_user_due_idx
  ON conjugation_progress (user_id, next_review_at);
