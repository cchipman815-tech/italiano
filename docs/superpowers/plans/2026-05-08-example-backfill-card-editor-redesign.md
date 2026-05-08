# Example Backfill + CardEditor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate example sentences for all existing cards that lack them, and redesign the CardEditor component to use a clean expand/collapse panel that moves Edit/Delete/Conjugate off the main row.

**Architecture:** Two independent tasks — a one-shot backfill script (no UI, runs locally via tsx) and a self-contained component rewrite of `CardEditor.tsx`. The script follows the exact same pattern as `scripts/backfill-plurals.ts`. The component redesign adds a single `expanded` boolean state, restructures the JSX into a main row + detail panel, and fixes mobile edit overflow with responsive stacked inputs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4 (`qz-*` tokens), Supabase JS client, Google Translate API v2, `npx tsx` for scripts.

---

### Task 1: Backfill example sentences for all eligible cards

**Goal:** Create `scripts/backfill-examples.ts` that generates and saves example sentences for every card that has no example and no conjugations.

**Files:**
- Create: `scripts/backfill-examples.ts`

**Acceptance Criteria:**
- [ ] Script queries all cards where `example IS NULL`
- [ ] Cards with conjugations are skipped (logged as skipped)
- [ ] Each remaining card gets an English template sentence via `buildEnglishExample`, translated EN→IT
- [ ] Result saved to `cards.example` as `{ italian: string, english: string }`
- [ ] 100ms sleep between API calls
- [ ] Final summary: `✓ N generated, N failed, N skipped`
- [ ] Running again is safe (idempotent — `example IS NULL` filter means already-filled cards are skipped)

**Verify:** `npx tsx scripts/backfill-examples.ts` → prints per-card results and summary with 0 errors on a clean run

**Steps:**

- [ ] **Step 1: Create the script**

Create `scripts/backfill-examples.ts` with this exact content:

```typescript
/**
 * backfill-examples.ts
 *
 * Generates example sentences for cards that don't have one yet.
 * Skips cards with conjugations (they have a conjugation table as study content).
 *
 * Strategy: build an English template sentence, translate EN→IT via Google Translate,
 * save both as { italian, english } JSONB to cards.example.
 *
 * Run: npx tsx scripts/backfill-examples.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY!
const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function translateText(text: string): Promise<string> {
  const res = await fetch(`${TRANSLATE_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'it', format: 'text' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Translation failed')
  return data.data.translations[0].translatedText as string
}

/**
 * Build a simple, natural English example sentence for a word/phrase.
 * Mirrors the logic in app/api/example/route.ts.
 */
function buildEnglishExample(english: string): string {
  const lower = english.toLowerCase().trim()

  // Verb (starts with "to "): "I [verb] every day."
  if (lower.startsWith('to ')) {
    const verb = lower.slice(3)
    return `I ${verb} every day.`
  }

  // Number: "There are [n] students in the class."
  if (/^\d+$/.test(lower)) {
    return `There are ${lower} students in the class.`
  }

  // Multi-word phrase without an article: wrap in quotes
  const words = lower.split(' ')
  if (words.length > 2 && !['the', 'a', 'an', 'il', 'la', 'lo', 'i', 'gli', 'le'].includes(words[0])) {
    return `We often say: "${english}".`
  }

  // Noun: "The [noun] is very nice."
  const noun = lower.replace(/^(the|a|an)\s+/i, '')
  if (noun.length < 15) {
    return `The ${noun} is very nice.`
  }

  // Fallback
  return `Can you use "${english}" in a sentence?`
}

async function main() {
  console.log('Fetching cards without examples…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, english, conjugations')
    .is('example', null)
    .order('sort_order')

  if (error) throw error
  console.log(`Found ${cards!.length} cards without examples.\n`)

  // Skip conjugation cards
  const todo = cards!.filter(c => !c.conjugations)
  const skipped = cards!.length - todo.length
  console.log(`${skipped} conjugation cards skipped. Processing ${todo.length}…\n`)

  let success = 0
  let failed = 0

  for (const card of todo) {
    try {
      const englishSentence = buildEnglishExample(card.english)
      const italianSentence = await translateText(englishSentence)

      const example = { italian: italianSentence, english: englishSentence }

      const { error: err } = await db
        .from('cards')
        .update({ example })
        .eq('id', card.id)

      if (err) throw err

      console.log(`  ✓ ${card.italian} → "${italianSentence}"`)
      success++

      await sleep(100)
    } catch (err) {
      console.error(`  ✗ ${card.italian}: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\n✓ ${success} examples generated, ${failed} failed, ${skipped} skipped.`)
}

main().catch(console.error)
```

- [ ] **Step 2: Run the script**

```bash
npx tsx scripts/backfill-examples.ts
```

Expected output: per-card `✓ italian → "sentence"` lines, then a summary like `✓ 48 examples generated, 0 failed, 28 skipped.`

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-examples.ts
git commit -m "feat: add backfill script for example sentences"
```

---

### Task 2: Redesign CardEditor with expand/collapse panel

**Goal:** Rewrite `components/CardEditor.tsx` so the main row shows only toggle + italian + english + expand button, with Edit/Conjugate/Delete moved inside an expandable detail panel. Fix mobile edit overflow.

**Files:**
- Modify: `components/CardEditor.tsx`

**Acceptance Criteria:**
- [ ] Main row contains only: toggle, Italian (+ gender badge + speak btn), English, expand button
- [ ] Cards with metadata (plural or example) show a blue `"N ▾"` / `"N ▸"` pill, always visible
- [ ] Cards with no metadata show a muted `"⋯"` button (hover-only on desktop via `group-hover`, always on mobile)
- [ ] Clicking either button toggles the detail panel open/closed
- [ ] Detail panel shows: plural row (with `+ plural` button if missing), example row (with `+ example` button if missing), example sentence text, divider, action row (Edit · Conjugate · Delete)
- [ ] Clicking Edit inside the panel sets `editing: true` and `expanded: false`
- [ ] Edit mode inputs are side-by-side on desktop, stacked full-width on mobile (`flex-col sm:flex-row`)
- [ ] Toggle (enable/disable) still works directly on the main row without opening the panel
- [ ] Conjugation editor sub-panel still renders below the card row when `showConjugations` is true

**Verify:** Load the edit page for any set in the browser on both desktop and mobile viewport. Verify: (1) main row is uncluttered, (2) expand button shows/hides the panel, (3) Edit mode doesn't overflow on mobile (375px viewport width).

**Steps:**

- [ ] **Step 1: Add `expanded` state and update the component signature**

In `components/CardEditor.tsx`, add `expanded` to the state declarations (around line 18):

```typescript
const [expanded, setExpanded] = useState(false)
```

- [ ] **Step 2: Replace the main row JSX**

Replace the entire `{!editing ? ( ... ) : ( ... )}` block inside the main row `div` with the following. This keeps the toggle outside (it's already there) and restructures the rest:

```tsx
{!editing ? (
  <>
    {/* Italian word */}
    <span className="flex-1 font-medium text-qz-text flex items-center gap-1.5 min-w-0">
      {card.italian}
      <GenderBadge gender={card.gender} size="sm" />
      <SpeakButton text={card.italian} size="sm" />
    </span>

    {/* English */}
    <span className="flex-1 text-qz-secondary min-w-0">{card.english}</span>

    {/* Expand button */}
    {metadataCount > 0 ? (
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-qz-blue bg-qz-blue-light px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
      >
        {metadataCount} {expanded ? '▾' : '▸'}
      </button>
    ) : (
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex-shrink-0 text-xs text-qz-secondary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer hover:text-qz-text"
      >
        ⋯
      </button>
    )}
  </>
) : (
  <>
    <div className="flex-1 flex flex-col sm:flex-row gap-2">
      <input
        value={italian}
        onChange={e => setItalian(e.target.value)}
        className="flex-1 border-2 border-qz-border rounded-lg px-2 py-1 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors"
        placeholder="Italian"
      />
      <input
        value={english}
        onChange={e => setEnglish(e.target.value)}
        className="flex-1 border-2 border-qz-border rounded-lg px-2 py-1 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors"
        placeholder="English"
      />
    </div>
    <button onClick={handleSaveText} disabled={saving} className="text-xs text-qz-blue font-semibold hover:text-qz-blue-dark disabled:opacity-50 cursor-pointer transition-colors flex-shrink-0">
      Save
    </button>
    <button onClick={() => { setItalian(card.italian); setEnglish(card.english); setEditing(false) }} className="text-xs text-qz-secondary hover:text-qz-text cursor-pointer transition-colors flex-shrink-0">
      Cancel
    </button>
  </>
)}
```

- [ ] **Step 3: Add the `metadataCount` derived value**

Add this just before the `return` statement (after the existing `hasConjugations` const):

```typescript
const metadataCount = (card.plural ? 1 : 0) + (card.example ? 1 : 0)
```

- [ ] **Step 4: Add the expanded detail panel**

Replace the existing example sentence display block (the `{card.example && ( ... )}` div at the bottom) with the full expanded panel:

```tsx
{/* Expanded detail panel */}
{expanded && !editing && (
  <div className="mt-2 ml-12 bg-qz-subtle border border-qz-border rounded-xl p-3">
    {/* Plural row */}
    {(card.plural || (card.gender && !card.conjugations)) && (
      <div className="flex items-center gap-3 mb-2">
        {card.plural ? (
          <span className="text-xs text-qz-secondary">
            pl. <span className="font-medium text-qz-text">{card.plural}</span>
          </span>
        ) : null}
        {card.gender && !card.plural && !card.conjugations && (
          <button
            onClick={handleGeneratePlural}
            disabled={generatingPlural}
            className="text-xs text-qz-secondary hover:text-qz-text disabled:opacity-50 cursor-pointer transition-colors"
          >
            {generatingPlural ? 'generating…' : '+ plural'}
          </button>
        )}
      </div>
    )}

    {/* Example row */}
    <div className="flex items-center gap-3 mb-2">
      {card.example ? (
        <span className="text-xs text-green-600 font-medium">example ✓</span>
      ) : !card.conjugations ? (
        <button
          onClick={handleGenerateExample}
          disabled={generatingExample}
          className="text-xs text-qz-secondary hover:text-qz-text disabled:opacity-50 cursor-pointer transition-colors"
        >
          {generatingExample ? 'generating…' : '+ example'}
        </button>
      ) : null}
    </div>

    {/* Example sentence text */}
    {card.example && (
      <div className="text-xs text-qz-secondary italic border-l-2 border-qz-border pl-2 py-0.5 mb-3">
        <span className="not-italic font-medium text-qz-muted">ex. </span>
        {card.example.italian}
        <span className="not-italic text-qz-muted mx-1">·</span>
        {card.example.english}
      </div>
    )}

    {/* Divider */}
    <div className="border-t border-qz-border pt-2 flex items-center gap-3">
      <button
        onClick={() => { setExpanded(false); setEditing(true) }}
        className="text-xs text-qz-blue hover:text-qz-blue-dark font-medium cursor-pointer transition-colors"
      >
        Edit
      </button>
      <button
        onClick={() => setShowConjugations(v => !v)}
        className="text-xs text-purple-600 hover:text-purple-800 font-medium cursor-pointer transition-colors"
      >
        Conjugate
      </button>
      <button
        onClick={handleDelete}
        className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer transition-colors ml-auto"
      >
        Delete
      </button>
    </div>
  </div>
)}

{/* Conjugation editor (unchanged — renders below panel) */}
{showConjugations && (
  <div className="mt-2 ml-12 bg-qz-blue-light border-2 border-qz-border rounded-2xl p-4">
    <p className="text-xs font-semibold text-qz-blue mb-3 uppercase tracking-wide">
      Present Tense Conjugations
    </p>
    <div className="grid grid-cols-3 gap-2">
      {PRONOUN_LABELS.map(pronoun => (
        <div key={pronoun}>
          <label className="text-xs text-qz-secondary mb-0.5 block font-medium">{pronoun}</label>
          <input
            value={conjugations[pronoun]}
            onChange={e => setConjugations(prev => ({ ...prev, [pronoun]: e.target.value }))}
            placeholder={pronoun === 'lui/lei' ? 'ha' : ''}
            className="w-full border-2 border-qz-border rounded-lg px-2 py-1 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white"
          />
        </div>
      ))}
    </div>
    <div className="flex gap-2 mt-3">
      <button
        onClick={handleSaveConjugations}
        disabled={saving}
        className="text-xs bg-qz-blue text-white px-4 py-1.5 rounded-full hover:bg-qz-blue-dark disabled:opacity-50 cursor-pointer font-semibold transition-colors"
      >
        {saving ? 'Saving…' : 'Save Conjugations'}
      </button>
      <button onClick={() => setShowConjugations(false)} className="text-xs text-qz-secondary hover:text-qz-text cursor-pointer transition-colors">
        Cancel
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Remove the now-replaced old action buttons and example display**

At this point the file should no longer contain the old `opacity-0 group-hover:opacity-100` Edit/Conjugate/Delete button cluster (previously inside the `!editing` branch), nor the old `{card.example && ( ... )}` block at the very bottom. Verify neither exists. The entire bottom of the component should now be the two blocks from Step 4.

- [ ] **Step 6: Verify in browser**

1. Open the edit page for a set that has cards with plurals and examples
2. Confirm: main row shows only toggle + words + expand button
3. Click the `"2 ▾"` pill — panel expands showing plural, example sentence, and Edit/Conjugate/Delete
4. Click Edit — panel closes, inputs appear in the row
5. Resize to 375px width — confirm inputs stack vertically, nothing overflows
6. Click `⋯` on a plain vocab card — panel shows just the action row

- [ ] **Step 7: Commit**

```bash
git add components/CardEditor.tsx
git commit -m "feat: redesign CardEditor with expand/collapse detail panel"
```
