# Three-Feature Update: Translation Fix, Dashboard Widget, Conjugation Flashcards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix sentence practice translation answers showing in the wrong language, add a rich translation widget to the dashboard, and add a conjugation-specific flashcard study mode.

**Architecture:** Three independent changes sharing the existing patterns — API route extension, new client component, new study page + component. No database schema changes required.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase Postgres, Google Cloud Translation API, Anthropic Claude API (Haiku)

---

## Feature 1: Sentence Practice Translation Bug Fix

### Problem

`TranslationQuestion` stores `options` and `correct` in Italian. When the study direction is `it-en`, the hint reads "Choose the correct English translation" but all answer choices are Italian sentences — the user can't actually translate anything.

### Fix

Update the Claude system prompt in `/app/api/sentences/generate/route.ts` so translation questions return two parallel option sets. Update the TypeScript type, the cache validation, the DB row mapper, and the `TranslationView` component to consume them.

### Data Shape Change

**Old metadata (in `sentences.metadata`):**
```json
{
  "options": ["Lei è alta e intelligente.", "Lei è alto e intelligente.", "Lui è alta e intelligente."],
  "correct": "Lei è alta e intelligente.",
  "grammarNote": "alta — feminine singular of alto"
}
```

**New metadata:**
```json
{
  "options_it": ["Lei è alta e intelligente.", "Lei è alto e intelligente.", "Lui è alta e intelligente."],
  "correct_it": "Lei è alta e intelligente.",
  "options_en": ["She is tall and intelligent.", "He is tall and intelligent.", "She is short and intelligent."],
  "correct_en": "She is tall and intelligent.",
  "grammarNote": "alta — feminine singular of alto"
}
```

### System Prompt Change

The translation question example in `SYSTEM_PROMPT` must be updated to include both `options_it`/`correct_it` and `options_en`/`correct_en`. The rules section must specify that `options_it` are Italian variants (grammar trap) and `options_en` are English translations (meaning trap — e.g. subtle meaning or register differences).

### Type Change

`TranslationQuestion` in `app/api/sentences/generate/route.ts`:

```typescript
export type TranslationQuestion = {
  id: string
  type: 'translation'
  italian: string
  english: string
  options_it: string[]   // replaces options
  correct_it: string     // replaces correct
  options_en: string[]
  correct_en: string
  grammarNote: string
}
```

### Cache Validation

The existing cache-hit check (`cached.length >= 10`) must also verify that at least one cached translation row has both `options_en` and `options_it` in its metadata. If stale rows lack these fields, delete and regenerate. This prevents stale cached questions from surfacing the old format.

### Component Change

`TranslationView` in `components/SentencePractice.tsx` picks option set based on `direction`:

```typescript
const options = direction === 'it-en' ? q.options_en : q.options_it
const correct = direction === 'it-en' ? q.correct_en : q.correct_it
```

---

## Feature 2: Dashboard Translation Widget

### Placement

A new `TranslatorWidget` component mounts in `app/home/page.tsx` between the `<header>` block and the `<div className="grid ...">` set grid. It spans full width, matching the page's `max-w-4xl mx-auto px-4` container.

### API Extension

`/app/api/translate/route.ts` gains two new modes alongside existing `translate` and `conjugations`:

**`mode: 'word'`**
1. Call Google Translate (EN→IT) for the Italian word.
2. Call Claude Haiku with a compact prompt to determine: definite article (`il`, `la`, `lo`, `l'`, `i`, `le`, `gli`), gender (`m` or `f`), plural form, and a one-line grammar note (e.g. `"Uses lo/gli because it starts with z-"`). Claude returns JSON.
3. Return `{ italian, article, gender, plural, grammarNote }`.

Claude prompt for word mode:
```
Given the Italian word "{italian}" (English: "{english}"), return ONLY valid JSON:
{"article":"lo","gender":"m","plural":"gli zaini","grammarNote":"Uses lo/gli because it starts with z-"}
Rules: article is the definite singular form; gender is "m" or "f"; plural includes the definite article; grammarNote is one short sentence or empty string.
```

**`mode: 'sentence'`**
1. Call Google Translate (EN→IT) for the Italian sentence.
2. Call Claude Haiku to produce a short "literal structure" note explaining what structurally changed (word order, dropped pronoun, adverb formation, etc). Claude returns JSON.
3. Return `{ italian, literalNote }`.

Claude prompt for sentence mode:
```
English: "{english}"
Italian: "{italian}"
Return ONLY valid JSON with one field:
{"literalNote":"[Short explanation of what structurally changed, e.g. velocemente = a single adverb where English uses 'speak quickly']"}
Keep literalNote under 120 characters.
```

**Auto-detection:** The `TranslatorWidget` checks client-side whether the trimmed input contains a space. No space → sends `mode: 'word'`. Has space → sends `mode: 'sentence'`. The route does not need to resolve auto-detection itself.

### `TranslatorWidget.tsx` — New Component

Location: `components/TranslatorWidget.tsx`

**State:**
- `input: string` — the English text being typed
- `result: WordResult | SentenceResult | null`
- `loading: boolean`
- `error: string`

**WordResult:**
```typescript
{ type: 'word'; italian: string; article: string; gender: 'm' | 'f'; plural: string; grammarNote: string }
```

**SentenceResult:**
```typescript
{ type: 'sentence'; italian: string; literalNote: string }
```

**UI structure:**
```
[white rounded-2xl card, border-2 border-qz-border, shadow]
  Label: "🌐 Quick Translate"
  Row: [text input flex-1] [Translate button]

  [result panel — shown after successful fetch]
    Word result:
      Row: [large italian word] [🔊 SpeakButton]
      Badge row: [article badge blue] [gender badge pink/blue] [plural badge green]
      Grammar note (italic, small, qz-secondary) — omitted if empty

    Sentence result:
      Row: [italian sentence medium-bold] [🔊 SpeakButton]
      Inset box (bg-qz-subtle, rounded-xl):
        Label: "Literally in Italian structure" (xs, uppercase, qz-secondary)
        Note text (sm, italic, qz-text)
```

Typing in the input clears the result. Pressing Enter submits. The Translate button is disabled while loading.

---

## Feature 3: Conjugation Flashcard Mode

### Data Derivation

No database changes. Conjugation practice items are derived at runtime from verb cards that have `conjugations?.present` populated.

For each such verb card, 6 items are generated:

```typescript
interface ConjugationItem {
  verbItalian: string    // e.g. "avere"
  verbEnglish: string    // e.g. "to have"
  pronoun: string        // e.g. "io"
  italianForm: string    // e.g. "ho"
  englishMeaning: string // e.g. "I have"
}
```

English meanings are constructed using the same pronoun templates already in `/app/api/translate/route.ts`:
- io → "I {verbBase}"
- tu → "you {verbBase}"
- lui/lei → "he/she {verbBase}"
- noi → "we {verbBase}"
- voi → "you all {verbBase}"
- loro → "they {verbBase}"

Where `verbBase` strips "to " from the English (e.g. "to have" → "have").

The derived deck is shuffled on component mount. No progress is written to the database.

### `ConjugationStudy.tsx` — New Component

Location: `components/ConjugationStudy.tsx`

**Props:** `{ setId: string; cards: Card[] }`

**Behavior:**
- Filters `cards` to those with `conjugations?.present != null`
- Derives and shuffles the `ConjugationItem[]` deck
- Tracks `index`, `flipped`, `score`, `done` state
- Keyboard shortcuts: space/ArrowUp to flip, ← → to answer after flipping (mirrors `FlashcardStudy`)

**Card layout (IT→EN direction):**

Front:
```
[verb pill: "avere · verb" — bg-qz-blue-light text-qz-blue rounded-full]
[(io) ho  — text-3xl font-bold]  [🔊 SpeakButton for italianForm]
```
Bottom bar: blue "Tap to flip" button

Back:
```
[verb pill: "avere — to have"]
[(io) ho — small, qz-secondary]  [🔊 SpeakButton sm]
[I have — text-3xl font-bold]
```
Bottom bar: "← Don't know" / "Got it →" split (matches FlashcardStudy exactly)

**EN→IT direction flips front/back:**
Front: `[avere · verb]` + `I have` large + no speaker (English text)
Back: `(io) ho` large + 🔊 speaker

**Session complete screen:** score, "Study Again" button (resets deck), "Back to Set" button.

**Direction toggle:** Passed as a prop `direction: 'it-en' | 'en-it'` from the page, which reads it from the `?direction=` search param — same pattern as `FlashcardStudy`.

### `app/sets/[id]/conjugation/page.tsx` — New Page

Same auth + fetch pattern as other study pages. Fetches the set via `/api/sets/${id}`. Passes cards to `ConjugationStudy`.

If `cards.filter(c => c.conjugations?.present).length === 0`, renders an error state:
```
"No conjugation data in this set."
[Enable more cards] link → /sets/${id}/edit
```

### Set Detail Page + StudyModePicker Changes

**`app/sets/[id]/page.tsx`:**
```typescript
const hasConjugations = set.cards.some(c => c.conjugations?.present != null)
// Pass to StudyModePicker:
<StudyModePicker setId={id} canStudyMulti={canStudyMulti} dueCount={dueCount} hasConjugations={hasConjugations} />
```

**`components/StudyModePicker.tsx`:**
- Accepts new `hasConjugations: boolean` prop
- Adds a new entry in the mode list as the second item, between Flashcards and Sentence Practice:

```tsx
{hasConjugations && (
  <Link href={`/sets/${setId}/conjugation?direction=${direction}`} ...>
    <span>🔤</span>
    <div>
      <div className="font-semibold text-qz-text">Conjugations</div>
      <div className="text-sm text-qz-secondary">Drill every verb form as a flashcard</div>
    </div>
  </Link>
)}
```

The direction toggle already in StudyModePicker passes its value to this link via the `?direction=` param.

---

## Files Created or Modified

| File | Change |
|---|---|
| `app/api/sentences/generate/route.ts` | Update system prompt, `TranslationQuestion` type, cache validation, `rowsToQuestions` mapper |
| `components/SentencePractice.tsx` | Update `TranslationView` to use `options_en`/`correct_en` vs `options_it`/`correct_it` |
| `app/api/translate/route.ts` | Add `word` and `sentence` modes using Google Translate + Claude Haiku |
| `components/TranslatorWidget.tsx` | New component — translation input + rich result display |
| `app/home/page.tsx` | Import and mount `TranslatorWidget` (a client component) above the set grid — no conversion needed, server components can import client components directly |
| `components/ConjugationStudy.tsx` | New component — conjugation flashcard drill |
| `app/sets/[id]/conjugation/page.tsx` | New page — auth + fetch + render `ConjugationStudy` |
| `app/sets/[id]/page.tsx` | Compute `hasConjugations`, pass to `StudyModePicker` |
| `components/StudyModePicker.tsx` | Accept `hasConjugations` prop, render Conjugations mode entry |
