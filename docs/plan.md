# Feature Plan — Italiano App

Five planned features in priority order. Each section covers what it is, what changes are needed (DB, API, UI), and open questions.

---

## 1. Listening Mode

**What:** A new study mode where Italian audio plays automatically and the user selects (or types) the correct word — training the ear rather than reading. Pairs naturally with the Google TTS integration already in place.

**User flow:**
1. Audio plays automatically when card appears (no text shown)
2. User picks from 4 English options (like quiz, but triggered by sound)
3. After selecting, reveal the Italian word + play audio again
4. Score tracked, session summary at end

**New files:**
- `app/sets/[id]/listening/page.tsx` — server wrapper
- `components/ListeningStudy.tsx` — client study component

**Changes to existing files:**
- `app/sets/[id]/page.tsx` — add Listening mode card to mode picker
- `app/api/tts/route.ts` — no changes needed, already works

**DB changes:** None — uses existing cards and progress tables.

**API changes:** None — calls existing `/api/tts`.

**Key considerations:**
- Auto-play on component mount (needs user gesture workaround on mobile — may need a "Tap to start" screen)
- Replay button in case audio cuts off
- Min 4 enabled cards required (same as Quiz)
- TTS calls happen per card — consider pre-fetching next card's audio while user answers current

---

## 2. Spaced Repetition (SRS)

**What:** Cards you miss come back sooner; cards you know get scheduled further out. Based on a simplified SM-2 algorithm. Adds a "Review due today" mode separate from regular study.

**Algorithm (simplified SM-2):**
- Each card tracks: `interval` (days), `ease_factor` (float), `repetitions` (int), `next_review_at` (date)
- On correct: `interval = interval * ease_factor`, `ease_factor += 0.1`
- On incorrect: `interval = 1`, `ease_factor = max(1.3, ease_factor - 0.2)`, `repetitions = 0`
- New cards start at interval = 1 day

**DB migration required:**
```sql
ALTER TABLE progress
  ADD COLUMN interval integer NOT NULL DEFAULT 1,
  ADD COLUMN ease_factor float NOT NULL DEFAULT 2.5,
  ADD COLUMN repetitions integer NOT NULL DEFAULT 0,
  ADD COLUMN next_review_at date;
```

**New files:**
- `app/sets/[id]/review/page.tsx` — "Due today" review session wrapper
- `components/ReviewStudy.tsx` — SRS flashcard mode
- `supabase/migrations/003_srs.sql` — migration file

**Changes to existing files:**
- `app/api/progress/route.ts` — accept and save SRS fields (`interval`, `ease_factor`, `repetitions`, `next_review_at`)
- `app/sets/[id]/page.tsx` — show "X cards due" badge + Review button if any cards due
- `app/home/page.tsx` — show total due count across all sets
- `lib/types.ts` — add SRS fields to `Progress` interface

**Key considerations:**
- SRS applies per user (progress is already per user_id)
- First time a card is seen, `next_review_at` is null — show in new-card queue
- Review mode shows cards due today across the whole set (or across all sets)
- Keep existing Flashcard/Quiz/Match modes unchanged — SRS is a separate mode

---

## 3. Sentence Examples

**What:** When a card flips in flashcard mode (or after answering in quiz/listening), show a real-world example sentence using the word in context. Helps connect vocabulary to actual usage.

**Sources for sentences:**
- Auto-generate via Google Translate: translate a template like `"Use [italian_word] in a sentence"` — unreliable
- **Better:** Use a dedicated `/api/example` endpoint that calls Google Translate to translate a pre-prompted English example sentence to Italian
- **Best but requires API key:** Use Claude/OpenAI to generate a natural example sentence with English translation

**Recommended approach:** Add a nullable `example` field to cards (stores `{ italian: string, english: string }`). Generate examples on-demand via a new `/api/example` endpoint and cache them in the DB. User can also manually edit examples in CardEditor.

**DB migration required:**
```sql
ALTER TABLE cards ADD COLUMN example jsonb;
-- Shape: { "italian": "Ho una casa grande.", "english": "I have a big house." }
```

**New files:**
- `app/api/example/route.ts` — POST `{ cardId, italian, english }` → generate and save example sentence

**Changes to existing files:**
- `lib/types.ts` — add `example?: { italian: string; english: string } | null` to `Card`
- `components/FlashcardStudy.tsx` — show example on card back (below English translation)
- `components/QuizStudy.tsx` — show example after answering
- `components/CardEditor.tsx` — show/edit example, "Generate" button
- `supabase/migrations/004_examples.sql`

**Key considerations:**
- Example generation is optional/lazy — don't block study if not present
- Add SpeakButton for the Italian example sentence
- Cap sentence length for display (mobile-friendly)

---

## 4. Gender Badges

**What:** Italian nouns are masculine or feminine. Display a color-coded badge (`M` / `F`) on every noun card. Optionally quiz on gender separately.

**Detection logic:**
- Parse the Italian text for articles: `il/lo/i/gli` → masculine, `la/le/l'` → feminine
- If Italian starts with `il `, `lo `, `un ` → masculine
- If Italian starts with `la `, `una ` → feminine
- `l'` is ambiguous — leave as unknown, let user set manually
- Cards without articles (verbs, adjectives, phrases) → no badge

**DB migration required:**
```sql
ALTER TABLE cards ADD COLUMN gender text CHECK (gender IN ('m', 'f', null));
```

**New files:**
- `components/GenderBadge.tsx` — small pill: blue `M` or pink `F`
- `scripts/backfill-gender.ts` — auto-detect and populate gender for all existing noun cards

**Changes to existing files:**
- `lib/types.ts` — add `gender?: 'm' | 'f' | null` to `Card`
- `components/CardEditor.tsx` — show GenderBadge, allow manual override (M / F / None toggle)
- `components/FlashcardStudy.tsx` — show GenderBadge on card front + back
- `components/QuizStudy.tsx` — show GenderBadge on question card
- `app/sets/[id]/page.tsx` — optionally show a "Gender Quiz" mode for noun sets
- `supabase/migrations/005_gender.sql`

**Key considerations:**
- Auto-detect covers most cases; manual override in CardEditor for edge cases
- `l'` (elision) requires looking at the noun itself to determine gender — can default to unknown
- Gender badge on conjugation cards not needed (they're verb forms)

---

## 5. Plural Forms

**What:** Italian plurals don't follow simple rules (il libro → i libri, la mano → le mani, il/la cantante → i/le cantanti). Store the plural alongside each noun and display it on flashcards. Optionally quiz on plural forms.

**Storage:** Add `plural` field to cards for the Italian plural form.

**Auto-generation:** `/api/translate` can generate plurals by translating `"the [english_word] (plural)"` or by sending the Italian noun to Google Translate as a plural. Alternatively, a dedicated `/api/plural` endpoint builds the Italian plural phrase (`"i libri"`) and translates it back to confirm.

**DB migration required:**
```sql
ALTER TABLE cards ADD COLUMN plural text;
-- Stores Italian plural form only, e.g. "libri" or "le mani"
```

**New files:**
- `scripts/backfill-plurals.ts` — generate plurals for all existing noun cards via Google Translate
- `app/api/plural/route.ts` — POST `{ cardId, italian, english }` → generate and save plural form

**Changes to existing files:**
- `lib/types.ts` — add `plural?: string | null` to `Card`
- `components/CardEditor.tsx` — show plural field, "Generate" button
- `components/FlashcardStudy.tsx` — show plural on card back (e.g. "Plural: libri")
- `components/GenderBadge.tsx` — consider combining gender + plural in one metadata line
- `supabase/migrations/006_plural.sql`

**Key considerations:**
- Plurals only relevant for nouns (skip verbs, adjectives, conjugation cards, phrases)
- Some nouns are invariable (il/la cantante → i/le cantanti — no form change, only article changes)
- Display format: small line below English — `♂ il libro · libri` or `🔵 M · libro / libri`

---

## Implementation Order

| # | Feature | DB migration | Complexity |
|---|---|---|---|
| 1 | Gender badges | `005_gender.sql` | Low |
| 2 | Plural forms | `006_plural.sql` | Low-Medium |
| 3 | Sentence examples | `004_examples.sql` | Medium |
| 4 | Listening mode | None | Medium |
| 5 | Spaced repetition | `003_srs.sql` | High |

**Rationale:** Gender and plurals are data additions with minimal UI changes — good warmup. Examples and Listening build on existing TTS/translate infrastructure. SRS is the most architecturally complex (new algorithm, new DB columns, affects progress flow) so save it for last.

---

## Shared Migration Notes

Run all SQL migrations manually in Supabase SQL Editor (Dashboard → SQL Editor).
Migration files live in `supabase/migrations/` for reference.
After any schema change, update `lib/types.ts` to match.
