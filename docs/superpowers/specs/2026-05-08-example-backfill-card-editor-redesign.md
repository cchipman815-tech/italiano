# Example Backfill + CardEditor Redesign

**Date:** 2026-05-08  
**Status:** Approved

---

## Overview

Two improvements to the Italian flashcard app:

1. **Example backfill script** — auto-generate example sentences for all cards that are missing them
2. **CardEditor layout redesign** — collapse Edit/Delete/Conjugate into an expandable panel, fix mobile overflow in edit mode

---

## Part 1: Example Backfill Script

### Goal

Generate example sentences for every card that doesn't have one yet, using the same strategy as the existing `/api/example` route.

### File

- Create: `scripts/backfill-examples.ts`

### Logic

1. Query all cards from Supabase where `example IS NULL`
2. Skip cards that have conjugations (they have a conjugation table as study content — examples aren't needed)
3. For each remaining card, call `buildEnglishExample(english)` to construct an English template sentence, then translate EN→IT via Google Translate API
4. Save `{ italian, english }` JSONB to the `cards.example` column
5. 100ms sleep between requests to avoid rate limits
6. Log each result and print a final `✓ N generated, N failed` summary

### Run

```bash
npx tsx scripts/backfill-examples.ts
```

### Constraints

- Uses `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_TRANSLATE_API_KEY` from `.env.local`
- Idempotent: cards that already have an example are skipped
- Does not overwrite existing examples

---

## Part 2: CardEditor Layout Redesign

### Goal

Replace the cluttered single-row layout with a clean row + expandable detail panel. Fix mobile editing overflow.

### Files

- Modify: `components/CardEditor.tsx`

### View Mode — Main Row

Each card row contains only:

```
[toggle] [Italian + gender badge + speak btn]   [English]   [expand button]
```

The expand button has two states:
- **Cards with metadata** (plural and/or example): colored blue pill showing count + chevron — `"2 ▾"` or `"1 ▾"`. Always visible.
- **Cards with no metadata**: muted gray `"⋯"` button. Visible on hover on desktop (`group-hover:opacity-100`), always visible on mobile.

### View Mode — Expanded Detail Panel

Clicking the expand button toggles an inline panel below the row (indented to align with the Italian text, matching current `ml-12` pattern):

```
┌─────────────────────────────────────────┐
│ pl. le mamme    example ✓               │
│ ─────────────────────────────────────── │
│ ex. Spesso diciamo...  · We often say...│
│ ─────────────────────────────────────── │
│ Edit   Conjugate              Delete    │
└─────────────────────────────────────────┘
```

Panel contents (each section only renders if relevant):
- **Plural row**: shows `pl. [word]` if exists; shows `+ plural` generate button if card has gender but no plural and no conjugations
- **Example row**: shows `example ✓` if exists; shows `+ example` generate button if card has no example and no conjugations
- **Example text**: italic sentence display (Italian · English), only if example exists
- **Divider**
- **Action row**: Edit (blue) on the left, Conjugate (purple) center, Delete (red) on the right

Cards with no metadata and no context (pure vocabulary, no gender) still get the `⋯` button — the panel opens to show just the action row.

### Edit Mode

Triggered by clicking Edit inside the expanded panel. The panel closes (`expanded` resets to `false`) and the card row transitions to edit mode:

**Desktop**: two inputs side-by-side (current behavior)  
**Mobile** (`sm:` breakpoint and below): inputs stack vertically, each full-width

```
[Italian input          ]
[English input          ]
[Save]  [Cancel]
```

The conjugation editor sub-panel behavior is unchanged.

### State

- `expanded: boolean` — tracks whether the detail panel is open for this card
- Clicking the expand button toggles `expanded`
- `editing` state continues to work as before, triggered from inside the panel

### Acceptance Criteria

- [ ] Main card row contains only: toggle, Italian (+ badge + speak), English, expand button
- [ ] Cards with metadata show colored chevron pill with count, always visible
- [ ] Cards without metadata show muted `⋯`, visible on hover desktop / always mobile
- [ ] Expanded panel shows plural, example text, and Edit/Conjugate/Delete
- [ ] `+ plural` and `+ example` generate buttons appear in the panel when applicable
- [ ] Edit mode inputs stack vertically on mobile (no horizontal overflow)
- [ ] Conjugation editor still works (triggered from Conjugate button in panel)
- [ ] Toggle (enable/disable) still works directly on the main row without expanding
