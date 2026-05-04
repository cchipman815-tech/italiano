-- Users (seeded once, never modified by app)
CREATE TABLE users (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL
);

-- Flashcard sets
CREATE TABLE sets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cards within a set
CREATE TABLE cards (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id     UUID    NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  italian    TEXT    NOT NULL,
  english    TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Per-user per-card progress
CREATE TABLE progress (
  user_id      INTEGER     NOT NULL REFERENCES users(id),
  card_id      UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  known        BOOLEAN     NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

-- Seed users
INSERT INTO users (id, name) VALUES (1, 'Chance'), (2, 'Jennifer');
