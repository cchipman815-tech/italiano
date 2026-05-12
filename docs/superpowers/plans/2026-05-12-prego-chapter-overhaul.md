# Prego Chapter Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Italiano app around Prego chapter vocabulary, add richer card backs (articles, adjective forms, pronoun-labeled conjugations), replace broken Google Translate example generation with Claude, and add a new Sentence Practice study mode.

**Architecture:** Fifteen sequential tasks from DB migration through new components. A shared `/api/claude` wrapper centralises all Claude calls. The set detail page gains a direction toggle (IT→EN / EN→IT) that flows into Flashcards and Sentence Practice via URL search param. New `sentences` table caches Claude-generated practice sessions per set.

**Tech Stack:** Next.js 16.2 App Router · React 19 · TypeScript 5 · Tailwind v4 · Supabase Postgres · `@anthropic-ai/sdk` (new) · Google Cloud TTS (unchanged)

---

## File Map

### New files
| File | Purpose |
|---|---|
| `supabase/migrations/007_chapter_overhaul.sql` | Add chapter/article/word_type/adjective_forms/tense to cards; create sentences table |
| `app/api/claude/route.ts` | Shared Claude wrapper (model, system prompt, error handling) |
| `app/api/sentences/generate/route.ts` | Generate + cache 10-question Sentence Practice sessions |
| `app/sets/[id]/sentence-practice/page.tsx` | Server wrapper for SentencePractice |
| `components/SentencePractice.tsx` | Fill-blank / dialogue / translation interactive UI |
| `components/StudyModePicker.tsx` | Direction toggle + all study mode links (client component) |
| `scripts/reset-content.ts` | Truncate sets + cards (progress cascades) |
| `scripts/seed-chapters.ts` | Seed Ch 1–3 vocabulary from Prego Parole da ricordare |

### Modified files
| File | Change |
|---|---|
| `lib/types.ts` | Add AdjForms interface; extend Card with chapter/article/word_type/adjective_forms/tense |
| `app/api/cards/[id]/route.ts` | PUT accepts new card fields |
| `app/api/example/route.ts` | Replace Google Translate with Claude |
| `app/api/plural/route.ts` | Replace Google Translate with Claude |
| `components/FlashcardStudy.tsx` | Direction toggle prop; word-type-specific backs; flip bar only; split answer buttons |
| `components/CardEditor.tsx` | Add word_type / article / chapter / tense / adjective_forms fields |
| `app/sets/[id]/page.tsx` | Render StudyModePicker instead of inline study mode links |
| `app/sets/[id]/flashcard/page.tsx` | Pass direction search param to FlashcardStudy |
| `scripts/backfill-examples.ts` | Call Anthropic SDK directly instead of Google Translate |

---

### Task 0: Install Anthropic SDK

**Goal:** Add `@anthropic-ai/sdk` as a dependency and document the required env var.

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local` (add key)

**Acceptance Criteria:**
- [ ] `@anthropic-ai/sdk` listed in `package.json` dependencies
- [ ] `ANTHROPIC_API_KEY` present in `.env.local`
- [ ] `npx tsc --noEmit` exits 0

**Verify:** `grep -r "anthropic" package.json` → shows version string

**Steps:**

- [ ] **Step 1: Install the SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Add env var to `.env.local`**

Open `.env.local` and append:
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @anthropic-ai/sdk"
```

---

### Task 1: DB Migration 007

**Goal:** Add `chapter`, `article`, `word_type`, `adjective_forms`, `tense` columns to `cards`; create `sentences` table with `metadata` jsonb.

**Files:**
- Create: `supabase/migrations/007_chapter_overhaul.sql`

**Acceptance Criteria:**
- [ ] Migration file exists with all column additions and table creation
- [ ] Migration applies cleanly against the Supabase project (via MCP or dashboard)
- [ ] `sentences` table visible in Supabase Table Editor

**Verify:** After applying, run `SELECT column_name FROM information_schema.columns WHERE table_name='cards' ORDER BY ordinal_position;` — shows `chapter`, `article`, `word_type`, `adjective_forms`, `tense`

**Steps:**

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/007_chapter_overhaul.sql`:

```sql
-- 007_chapter_overhaul.sql
-- Adds richer card metadata columns and the sentences table for Sentence Practice.

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS chapter        integer,
  ADD COLUMN IF NOT EXISTS article        text,
  ADD COLUMN IF NOT EXISTS word_type      text,
  ADD COLUMN IF NOT EXISTS adjective_forms jsonb,
  ADD COLUMN IF NOT EXISTS tense          text DEFAULT 'present';

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
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `mcp__75d160c7-29f7-4143-a89d-aa50445e1490__apply_migration` tool, or paste into Supabase SQL Editor and run.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_chapter_overhaul.sql
git commit -m "feat: migration 007 — add chapter/article/word_type/adjective_forms/tense to cards, create sentences table"
```

---

### Task 2: Update TypeScript Types

**Goal:** Extend the `Card` interface with the five new columns; add `AdjForms` interface for adjective_forms shape.

**Files:**
- Modify: `lib/types.ts`

**Acceptance Criteria:**
- [ ] `AdjForms` interface exported with `ms`, `mp`, `fs`, `fp` string fields
- [ ] `Card` interface includes `chapter`, `article`, `word_type`, `adjective_forms`, `tense`
- [ ] `npx tsc --noEmit` exits 0

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Edit `lib/types.ts`**

Replace the current file contents with:

```typescript
export interface User {
  id: number
  name: string
}

export interface Set {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
  created_at: string
}

export interface Conjugations {
  present?: ConjugationForms
  past?: ConjugationForms
  future?: ConjugationForms
}

export interface ConjugationForms {
  io: string
  tu: string
  'lui/lei': string
  noi: string
  voi: string
  loro: string
}

export interface AdjForms {
  ms: string
  fs: string
  mp: string
  fp: string
}

export type WordType = 'noun' | 'verb' | 'adjective' | 'phrase' | 'expression'

export interface Card {
  id: string
  set_id: string
  italian: string
  english: string
  sort_order: number
  conjugations: Conjugations | null
  enabled: boolean
  gender?: 'm' | 'f' | null
  plural?: string | null
  example?: { italian: string; english: string } | null
  chapter?: number | null
  article?: string | null
  word_type?: WordType | null
  adjective_forms?: AdjForms | null
  tense?: string | null
}

export interface Progress {
  user_id: number
  card_id: string
  known: boolean
  last_seen_at: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review_at: string | null
}

export interface SetWithProgress extends Set {
  total_cards: number
  known_cards: number
}

export interface SetWithCards extends Set {
  cards: Card[]
  progress: Progress[]
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add AdjForms, WordType, and new card fields to TypeScript types"
```

---

### Task 3: Update `/api/cards/[id]` PUT

**Goal:** Accept `word_type`, `article`, `chapter`, `adjective_forms`, and `tense` in the card update endpoint.

**Files:**
- Modify: `app/api/cards/[id]/route.ts`

**Acceptance Criteria:**
- [ ] PUT handler extracts and saves all five new fields
- [ ] Existing fields (italian, english, conjugations, enabled, plural, example) unchanged
- [ ] `npx tsc --noEmit` exits 0

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Read current file**

Read `app/api/cards/[id]/route.ts` to see the current PUT body extraction.

- [ ] **Step 2: Update PUT body destructuring and update object**

Find the PUT handler. The current body destructuring looks like:
```typescript
const { italian, english, conjugations, enabled, plural, example } = await req.json()
```

Replace the entire PUT handler body with:

```typescript
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const body = await req.json() as {
    italian?: string
    english?: string
    conjugations?: unknown
    enabled?: boolean
    plural?: string | null
    example?: { italian: string; english: string } | null
    word_type?: string | null
    article?: string | null
    chapter?: number | null
    adjective_forms?: { ms: string; fs: string; mp: string; fp: string } | null
    tense?: string | null
  }

  const updates: Record<string, unknown> = {}
  if (body.italian     !== undefined) updates.italian      = body.italian
  if (body.english     !== undefined) updates.english      = body.english
  if (body.conjugations !== undefined) updates.conjugations = body.conjugations
  if (body.enabled     !== undefined) updates.enabled      = body.enabled
  if (body.plural      !== undefined) updates.plural       = body.plural
  if (body.example     !== undefined) updates.example      = body.example
  if (body.word_type   !== undefined) updates.word_type    = body.word_type
  if (body.article     !== undefined) updates.article      = body.article
  if (body.chapter     !== undefined) updates.chapter      = body.chapter
  if (body.adjective_forms !== undefined) updates.adjective_forms = body.adjective_forms
  if (body.tense       !== undefined) updates.tense        = body.tense

  const db = createServerClient()
  const { error } = await db.from('cards').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/cards/\[id\]/route.ts
git commit -m "feat: accept word_type/article/chapter/adjective_forms/tense in card PUT endpoint"
```

---

### Task 4: Build `/api/claude` Shared Wrapper

**Goal:** Create a thin internal API route that wraps the Anthropic SDK so all Claude-powered features share one model config and error handler.

**Files:**
- Create: `app/api/claude/route.ts`

**Acceptance Criteria:**
- [ ] POST `/api/claude` with `{ prompt, systemPrompt?, maxTokens? }` returns `{ content: string }`
- [ ] Uses `claude-haiku-4-5-20251001` by default (fast + cheap for short generations)
- [ ] Returns 500 with `{ error }` on Anthropic API failure
- [ ] `npx tsc --noEmit` exits 0

**Verify:** `npx tsc --noEmit` → no errors; manual test via `curl -X POST http://localhost:3000/api/claude -H 'Content-Type: application/json' -d '{"prompt":"Say: ciao"}' -b 'userId=1'` → `{"content":"ciao"}`

**Steps:**

- [ ] **Step 1: Create `app/api/claude/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { prompt, systemPrompt, maxTokens = 512 } = await req.json() as {
    prompt: string
    systemPrompt?: string
    maxTokens?: number
  }

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/claude/route.ts
git commit -m "feat: add /api/claude shared Anthropic SDK wrapper"
```

---

### Task 5: Rewrite `/api/example` with Claude

**Goal:** Replace the broken `buildEnglishExample` + Google Translate approach with a direct Claude call that generates accurate, beginner-appropriate Italian example sentences.

**Files:**
- Modify: `app/api/example/route.ts`

**Acceptance Criteria:**
- [ ] POST `/api/example` returns a valid `{ example: { italian, english } }` for any card
- [ ] Italian sentence uses correct grammar (no more "The you are is very nice")
- [ ] Sentence is 5–10 words, beginner level
- [ ] Saves result to `cards.example`

**Verify:** Start dev server; in CardEditor click "+ example" on a verb card → Italian sentence is grammatically correct

**Steps:**

- [ ] **Step 1: Rewrite `app/api/example/route.ts`**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an Italian language tutor helping beginners study.
Generate one short, natural example sentence (5–10 words) using the given Italian word.
Use only present-tense vocabulary appropriate for Prego! Italian chapter 1–3 level.
No subjunctive, conditional, or complex tenses.
Respond with JSON only: {"italian":"<sentence>","english":"<translation>"}
No markdown, no explanation, no extra keys.`

export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { cardId, italian, english } = await req.json() as {
    cardId: string
    italian: string
    english: string
  }

  if (!cardId || !italian || !english) {
    return NextResponse.json({ error: 'cardId, italian, and english are required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Italian word: "${italian}" (English: "${english}")\nGenerate an example sentence using this word.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const example = JSON.parse(raw) as { italian: string; english: string }

    const db = createServerClient()
    const { error } = await db.from('cards').update({ example }).eq('id', cardId)
    if (error) throw error

    return NextResponse.json({ example })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/example/route.ts
git commit -m "feat: replace Google Translate example generation with Claude"
```

---

### Task 6: Rewrite `/api/plural` with Claude

**Goal:** Replace the Google Translate plural hack (translating "the words") with Claude for accurate Italian plural generation.

**Files:**
- Modify: `app/api/plural/route.ts`

**Acceptance Criteria:**
- [ ] POST `/api/plural` returns correct `{ plural: string }` — bare plural form, no article
- [ ] Handles irregular nouns correctly (e.g., uomo → uomini)
- [ ] Saves result to `cards.plural`

**Verify:** Start dev server; in CardEditor click "+ plural" on a noun card → plural form is correct and has no leading article

**Steps:**

- [ ] **Step 1: Rewrite `app/api/plural/route.ts`**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an Italian grammar expert.
Given an Italian noun (singular form, without article), return its plural form.
Return only the plural form — no article, no explanation.
Example: "libro" → "libri", "uomo" → "uomini", "città" → "città"
Respond with plain text only.`

export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { cardId, italian, english } = await req.json() as {
    cardId: string
    italian: string
    english: string
  }

  if (!cardId || !italian || !english) {
    return NextResponse.json({ error: 'cardId, italian, and english are required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Italian noun (singular): "${italian}" (English: "${english}")\nPlural form:`,
      }],
    })

    const plural = message.content[0].type === 'text'
      ? message.content[0].text.trim().toLowerCase()
      : ''

    if (!plural) throw new Error('Empty response from Claude')

    const db = createServerClient()
    const { error } = await db.from('cards').update({ plural }).eq('id', cardId)
    if (error) throw error

    return NextResponse.json({ plural })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/plural/route.ts
git commit -m "feat: replace Google Translate plural generation with Claude"
```

---

### Task 7: Update CardEditor

**Goal:** Add `word_type`, `article`, `chapter`, `tense`, and `adjective_forms` fields to the CardEditor expanded detail panel.

**Files:**
- Modify: `components/CardEditor.tsx`

**Acceptance Criteria:**
- [ ] `word_type` selector (noun/verb/adjective/phrase/expression) visible in expanded panel
- [ ] `article` text input appears when word_type is noun
- [ ] `chapter` number input present
- [ ] `tense` selector (present/past/future) appears when word_type is verb
- [ ] `adjective_forms` 4-field grid (ms/fs/mp/fp) appears when word_type is adjective
- [ ] All new fields save via the existing `onSave` prop with the new fields passed
- [ ] `npx tsc --noEmit` exits 0

**Verify:** Open edit page, expand a card → new fields are visible and save correctly

**Steps:**

- [ ] **Step 1: Extend the `Props` `onSave` type**

In `components/CardEditor.tsx`, update the `Props` interface to include the new fields in `onSave`:

```typescript
interface Props {
  card: Card
  onSave: (
    id: string,
    fields: Partial<Pick<Card,
      'italian' | 'english' | 'conjugations' | 'enabled' | 'plural' | 'example' |
      'word_type' | 'article' | 'chapter' | 'tense' | 'adjective_forms'
    >>
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}
```

- [ ] **Step 2: Add local state for new fields**

After the existing state declarations (after `const [generatingExample, setGeneratingExample] = useState(false)`), add:

```typescript
const [wordType, setWordType]   = useState<string>(card.word_type ?? '')
const [article, setArticle]     = useState(card.article ?? '')
const [chapter, setChapter]     = useState<string>(card.chapter?.toString() ?? '')
const [tense, setTense]         = useState(card.tense ?? 'present')
const [adjForms, setAdjForms]   = useState({
  ms: card.adjective_forms?.ms ?? '',
  fs: card.adjective_forms?.fs ?? '',
  mp: card.adjective_forms?.mp ?? '',
  fp: card.adjective_forms?.fp ?? '',
})
```

- [ ] **Step 3: Add save handler for new metadata fields**

Add a new handler below `handleGenerateExample`:

```typescript
async function handleSaveMetadata() {
  setSaving(true)
  const fields: Parameters<typeof onSave>[1] = {
    word_type: wordType || null,
    article:   article.trim() || null,
    chapter:   chapter ? parseInt(chapter, 10) : null,
    tense:     wordType === 'verb' ? tense : null,
    adjective_forms: wordType === 'adjective' && adjForms.ms
      ? adjForms
      : null,
  }
  await onSave(card.id, fields)
  setSaving(false)
}
```

- [ ] **Step 4: Add fields to the expanded panel**

Inside the `{expanded && !editing && (…)}` block, after the existing "Example row" section and before the "Divider + actions" row, insert:

```tsx
{/* Metadata fields */}
<div className="border-t border-qz-border pt-3 mt-1 flex flex-col gap-2">
  {/* word_type */}
  <div className="flex items-center gap-2">
    <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Type</label>
    <select
      value={wordType}
      onChange={e => setWordType(e.target.value)}
      className="flex-1 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
    >
      <option value="">—</option>
      <option value="noun">Noun</option>
      <option value="verb">Verb</option>
      <option value="adjective">Adjective</option>
      <option value="phrase">Phrase</option>
      <option value="expression">Expression</option>
    </select>
  </div>

  {/* article — noun only */}
  {wordType === 'noun' && (
    <div className="flex items-center gap-2">
      <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Article</label>
      <input
        value={article}
        onChange={e => setArticle(e.target.value)}
        placeholder="il / la / lo / l'"
        className="flex-1 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
      />
    </div>
  )}

  {/* chapter */}
  <div className="flex items-center gap-2">
    <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Chapter</label>
    <input
      type="number"
      value={chapter}
      onChange={e => setChapter(e.target.value)}
      placeholder="1–18"
      min="1" max="18"
      className="w-20 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
    />
  </div>

  {/* tense — verb only */}
  {wordType === 'verb' && (
    <div className="flex items-center gap-2">
      <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Tense</label>
      <select
        value={tense}
        onChange={e => setTense(e.target.value)}
        className="flex-1 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
      >
        <option value="present">Present</option>
        <option value="past">Past</option>
        <option value="future">Future</option>
      </select>
    </div>
  )}

  {/* adjective_forms — adjective only */}
  {wordType === 'adjective' && (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-qz-secondary">Adjective forms</label>
      <div className="grid grid-cols-2 gap-1">
        {(['ms','fs','mp','fp'] as const).map(key => (
          <div key={key}>
            <label className="text-xs text-qz-muted">{key}</label>
            <input
              value={adjForms[key]}
              onChange={e => setAdjForms(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
            />
          </div>
        ))}
      </div>
    </div>
  )}

  <button
    type="button"
    onClick={handleSaveMetadata}
    disabled={saving}
    className="self-start text-xs bg-qz-blue text-white px-3 py-1 rounded-full hover:bg-qz-blue-dark disabled:opacity-50 cursor-pointer font-semibold transition-colors"
  >
    {saving ? 'Saving…' : 'Save fields'}
  </button>
</div>
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/CardEditor.tsx
git commit -m "feat: add word_type/article/chapter/tense/adjective_forms to CardEditor"
```

---

### Task 8: Content Reset Script

**Goal:** Create a one-shot script that truncates `sets` and `cards`. Progress cascade-deletes automatically. Run this once before seeding.

**Files:**
- Create: `scripts/reset-content.ts`

**Acceptance Criteria:**
- [ ] Script deletes all rows from `cards` then `sets`
- [ ] Requires explicit `--confirm` flag to run (safety gate)
- [ ] Prints count of deleted rows

**Verify:** `npx tsx scripts/reset-content.ts --confirm` → prints "Deleted X cards, Y sets" with no errors

**Steps:**

- [ ] **Step 1: Create `scripts/reset-content.ts`**

```typescript
/**
 * reset-content.ts
 * Deletes all sets and cards. Progress rows cascade-delete automatically.
 * Run: npx tsx scripts/reset-content.ts --confirm
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

if (!process.argv.includes('--confirm')) {
  console.error('Safety gate: pass --confirm to actually delete all content.')
  process.exit(1)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Delete cards first (FK constraint), then sets
  const { count: cardCount, error: cardErr } = await db
    .from('cards')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all
  if (cardErr) throw cardErr

  const { count: setCount, error: setErr } = await db
    .from('sets')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (setErr) throw setErr

  console.log(`Deleted ${cardCount ?? 0} cards, ${setCount ?? 0} sets.`)
  console.log('Progress rows cascade-deleted automatically.')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add scripts/reset-content.ts
git commit -m "feat: add reset-content script with --confirm safety gate"
```

---

### Task 9: Chapter Seed Script (Chapters 1–3)

**Goal:** Seed Chapters 1–3 vocabulary from Prego *Parole da ricordare* with all new card fields populated.

**Files:**
- Create: `scripts/seed-chapters.ts`

**Acceptance Criteria:**
- [ ] Running `npx tsx scripts/seed-chapters.ts` seeds Chapter 1, 2, and 3 sets
- [ ] Each card has correct `word_type`, `article` (nouns), `chapter`, `tense` (verbs), `adjective_forms` (adjectives)
- [ ] Running with `--chapter 2` seeds only Chapter 2

**Verify:** `npx tsx scripts/seed-chapters.ts` → "Seeded X cards across Y sets" with no errors; Supabase shows correct data

**Steps:**

- [ ] **Step 1: Create `scripts/seed-chapters.ts`**

```typescript
/**
 * seed-chapters.ts
 * Seeds Prego chapter vocabulary sets and cards.
 * Run: npx tsx scripts/seed-chapters.ts            (all chapters)
 *      npx tsx scripts/seed-chapters.ts --chapter 2 (single chapter)
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type WordType = 'noun' | 'verb' | 'adjective' | 'phrase' | 'expression'

interface SeedCard {
  italian: string
  english: string
  word_type: WordType
  article?: string
  gender?: 'm' | 'f'
  plural?: string
  tense?: string
  conjugations?: { present: Record<string, string> }
  adjective_forms?: { ms: string; fs: string; mp: string; fp: string }
}

interface SeedSet {
  chapter: number
  title: string
  description: string
  sort_order: number
  cards: SeedCard[]
}

const CHAPTERS: SeedSet[] = [
  {
    chapter: 1,
    title: 'Chapter 1 — Una città italiana',
    description: 'Places, transport, greetings; avere; indefinite articles; noun gender/number',
    sort_order: 1,
    cards: [
      // Nouns — places
      { italian: 'università', english: 'university', word_type: 'noun', article: "l'", gender: 'f', plural: 'università' },
      { italian: 'duomo', english: 'cathedral', word_type: 'noun', article: 'il', gender: 'm', plural: 'duomi' },
      { italian: 'palazzo', english: 'building / palazzo', word_type: 'noun', article: 'il', gender: 'm', plural: 'palazzi' },
      { italian: 'piazza', english: 'square / plaza', word_type: 'noun', article: 'la', gender: 'f', plural: 'piazze' },
      { italian: 'stazione', english: 'station', word_type: 'noun', article: 'la', gender: 'f', plural: 'stazioni' },
      { italian: 'via', english: 'street', word_type: 'noun', article: 'la', gender: 'f', plural: 'vie' },
      { italian: 'bar', english: 'coffee bar / café', word_type: 'noun', article: 'il', gender: 'm', plural: 'bar' },
      { italian: 'caffè', english: 'coffee / café', word_type: 'noun', article: 'il', gender: 'm', plural: 'caffè' },
      { italian: 'ristorante', english: 'restaurant', word_type: 'noun', article: 'il', gender: 'm', plural: 'ristoranti' },
      { italian: 'albergo', english: 'hotel', word_type: 'noun', article: "l'", gender: 'm', plural: 'alberghi' },
      { italian: 'cinema', english: 'movie theater', word_type: 'noun', article: 'il', gender: 'm', plural: 'cinema' },
      { italian: 'museo', english: 'museum', word_type: 'noun', article: 'il', gender: 'm', plural: 'musei' },
      { italian: 'biblioteca', english: 'library', word_type: 'noun', article: 'la', gender: 'f', plural: 'biblioteche' },
      { italian: 'farmacia', english: 'pharmacy', word_type: 'noun', article: 'la', gender: 'f', plural: 'farmacie' },
      { italian: 'mercato', english: 'market', word_type: 'noun', article: 'il', gender: 'm', plural: 'mercati' },
      { italian: 'banca', english: 'bank', word_type: 'noun', article: 'la', gender: 'f', plural: 'banche' },
      { italian: 'teatro', english: 'theater', word_type: 'noun', article: 'il', gender: 'm', plural: 'teatri' },
      { italian: 'autobus', english: 'bus', word_type: 'noun', article: "l'", gender: 'm', plural: 'autobus' },
      { italian: 'centro', english: 'downtown / city center', word_type: 'noun', article: 'il', gender: 'm', plural: 'centri' },
      { italian: 'libro', english: 'book', word_type: 'noun', article: 'il', gender: 'm', plural: 'libri' },
      { italian: 'zaino', english: 'backpack', word_type: 'noun', article: 'lo', gender: 'm', plural: 'zaini' },
      { italian: 'matita', english: 'pencil', word_type: 'noun', article: 'la', gender: 'f', plural: 'matite' },
      // Verbs
      {
        italian: 'avere', english: 'to have', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'ho', tu: 'hai', 'lui/lei': 'ha', noi: 'abbiamo', voi: 'avete', loro: 'hanno' } },
      },
      {
        italian: 'essere', english: 'to be', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'sono', tu: 'sei', 'lui/lei': 'è', noi: 'siamo', voi: 'siete', loro: 'sono' } },
      },
      {
        italian: 'andare', english: 'to go', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'vado', tu: 'vai', 'lui/lei': 'va', noi: 'andiamo', voi: 'andate', loro: 'vanno' } },
      },
      // Phrases
      { italian: 'Buongiorno', english: 'Good morning', word_type: 'phrase' },
      { italian: 'Buonasera', english: 'Good evening', word_type: 'phrase' },
      { italian: 'Buonanotte', english: 'Good night', word_type: 'phrase' },
      { italian: 'Ciao', english: 'Hi / Bye (informal)', word_type: 'phrase' },
      { italian: 'Arrivederci', english: 'Goodbye (formal)', word_type: 'phrase' },
      { italian: 'Come stai?', english: 'How are you? (informal)', word_type: 'phrase' },
      { italian: 'Come sta?', english: 'How are you? (formal)', word_type: 'phrase' },
      { italian: 'Sto bene, grazie', english: "I'm fine, thank you", word_type: 'phrase' },
      { italian: 'Prego', english: "You're welcome", word_type: 'phrase' },
      { italian: 'Scusa', english: 'Excuse me (informal)', word_type: 'phrase' },
      { italian: 'Scusi', english: 'Excuse me (formal)', word_type: 'phrase' },
      { italian: 'Per favore', english: 'Please', word_type: 'phrase' },
      { italian: 'Come ti chiami?', english: "What's your name? (informal)", word_type: 'phrase' },
      { italian: 'Mi chiamo...', english: 'My name is...', word_type: 'phrase' },
      { italian: "Dov'è...?", english: 'Where is...?', word_type: 'phrase' },
      { italian: 'Non capisco', english: "I don't understand", word_type: 'phrase' },
    ],
  },
  {
    chapter: 2,
    title: 'Chapter 2 — Come siamo',
    description: 'Adjectives, colors, nationalities; essere; definite articles',
    sort_order: 2,
    cards: [
      // Adjectives — appearance
      { italian: 'alto', english: 'tall', word_type: 'adjective', adjective_forms: { ms: 'alto', fs: 'alta', mp: 'alti', fp: 'alte' } },
      { italian: 'basso', english: 'short', word_type: 'adjective', adjective_forms: { ms: 'basso', fs: 'bassa', mp: 'bassi', fp: 'basse' } },
      { italian: 'bello', english: 'beautiful / handsome', word_type: 'adjective', adjective_forms: { ms: 'bello', fs: 'bella', mp: 'belli', fp: 'belle' } },
      { italian: 'brutto', english: 'ugly', word_type: 'adjective', adjective_forms: { ms: 'brutto', fs: 'brutta', mp: 'brutti', fp: 'brutte' } },
      { italian: 'giovane', english: 'young', word_type: 'adjective', adjective_forms: { ms: 'giovane', fs: 'giovane', mp: 'giovani', fp: 'giovani' } },
      { italian: 'vecchio', english: 'old', word_type: 'adjective', adjective_forms: { ms: 'vecchio', fs: 'vecchia', mp: 'vecchi', fp: 'vecchie' } },
      { italian: 'magro', english: 'thin / slim', word_type: 'adjective', adjective_forms: { ms: 'magro', fs: 'magra', mp: 'magri', fp: 'magre' } },
      { italian: 'grasso', english: 'fat', word_type: 'adjective', adjective_forms: { ms: 'grasso', fs: 'grassa', mp: 'grassi', fp: 'grasse' } },
      // Adjectives — personality
      { italian: 'simpatico', english: 'nice / friendly', word_type: 'adjective', adjective_forms: { ms: 'simpatico', fs: 'simpatica', mp: 'simpatici', fp: 'simpatiche' } },
      { italian: 'antipatico', english: 'unpleasant', word_type: 'adjective', adjective_forms: { ms: 'antipatico', fs: 'antipatica', mp: 'antipatici', fp: 'antipatiche' } },
      { italian: 'intelligente', english: 'intelligent', word_type: 'adjective', adjective_forms: { ms: 'intelligente', fs: 'intelligente', mp: 'intelligenti', fp: 'intelligenti' } },
      { italian: 'stupido', english: 'stupid', word_type: 'adjective', adjective_forms: { ms: 'stupido', fs: 'stupida', mp: 'stupidi', fp: 'stupide' } },
      { italian: 'ricco', english: 'rich', word_type: 'adjective', adjective_forms: { ms: 'ricco', fs: 'ricca', mp: 'ricchi', fp: 'ricche' } },
      { italian: 'povero', english: 'poor', word_type: 'adjective', adjective_forms: { ms: 'povero', fs: 'povera', mp: 'poveri', fp: 'povere' } },
      { italian: 'generoso', english: 'generous', word_type: 'adjective', adjective_forms: { ms: 'generoso', fs: 'generosa', mp: 'generosi', fp: 'generose' } },
      { italian: 'avaro', english: 'stingy / miserly', word_type: 'adjective', adjective_forms: { ms: 'avaro', fs: 'avara', mp: 'avari', fp: 'avare' } },
      { italian: 'tranquillo', english: 'calm / quiet', word_type: 'adjective', adjective_forms: { ms: 'tranquillo', fs: 'tranquilla', mp: 'tranquilli', fp: 'tranquille' } },
      { italian: 'nervoso', english: 'nervous / irritable', word_type: 'adjective', adjective_forms: { ms: 'nervoso', fs: 'nervosa', mp: 'nervosi', fp: 'nervose' } },
      { italian: 'stanco', english: 'tired', word_type: 'adjective', adjective_forms: { ms: 'stanco', fs: 'stanca', mp: 'stanchi', fp: 'stanche' } },
      { italian: 'contento', english: 'happy / pleased', word_type: 'adjective', adjective_forms: { ms: 'contento', fs: 'contenta', mp: 'contenti', fp: 'contente' } },
      { italian: 'triste', english: 'sad', word_type: 'adjective', adjective_forms: { ms: 'triste', fs: 'triste', mp: 'tristi', fp: 'tristi' } },
      // Colors
      { italian: 'rosso', english: 'red', word_type: 'adjective', adjective_forms: { ms: 'rosso', fs: 'rossa', mp: 'rossi', fp: 'rosse' } },
      { italian: 'verde', english: 'green', word_type: 'adjective', adjective_forms: { ms: 'verde', fs: 'verde', mp: 'verdi', fp: 'verdi' } },
      { italian: 'giallo', english: 'yellow', word_type: 'adjective', adjective_forms: { ms: 'giallo', fs: 'gialla', mp: 'gialli', fp: 'gialle' } },
      { italian: 'bianco', english: 'white', word_type: 'adjective', adjective_forms: { ms: 'bianco', fs: 'bianca', mp: 'bianchi', fp: 'bianche' } },
      { italian: 'nero', english: 'black', word_type: 'adjective', adjective_forms: { ms: 'nero', fs: 'nera', mp: 'neri', fp: 'nere' } },
      { italian: 'grigio', english: 'gray', word_type: 'adjective', adjective_forms: { ms: 'grigio', fs: 'grigia', mp: 'grigi', fp: 'grigie' } },
      { italian: 'blu', english: 'blue', word_type: 'adjective', adjective_forms: { ms: 'blu', fs: 'blu', mp: 'blu', fp: 'blu' } },
      { italian: 'arancione', english: 'orange', word_type: 'adjective', adjective_forms: { ms: 'arancione', fs: 'arancione', mp: 'arancioni', fp: 'arancioni' } },
      // Nationalities
      { italian: 'italiano', english: 'Italian', word_type: 'adjective', adjective_forms: { ms: 'italiano', fs: 'italiana', mp: 'italiani', fp: 'italiane' } },
      { italian: 'americano', english: 'American', word_type: 'adjective', adjective_forms: { ms: 'americano', fs: 'americana', mp: 'americani', fp: 'americane' } },
      { italian: 'francese', english: 'French', word_type: 'adjective', adjective_forms: { ms: 'francese', fs: 'francese', mp: 'francesi', fp: 'francesi' } },
      { italian: 'inglese', english: 'English / British', word_type: 'adjective', adjective_forms: { ms: 'inglese', fs: 'inglese', mp: 'inglesi', fp: 'inglesi' } },
      { italian: 'spagnolo', english: 'Spanish', word_type: 'adjective', adjective_forms: { ms: 'spagnolo', fs: 'spagnola', mp: 'spagnoli', fp: 'spagnole' } },
    ],
  },
  {
    chapter: 3,
    title: 'Chapter 3 — Studiare in Italia',
    description: 'Family, university subjects; -are verbs; possessives',
    sort_order: 3,
    cards: [
      // Family nouns
      { italian: 'padre', english: 'father', word_type: 'noun', article: 'il', gender: 'm', plural: 'padri' },
      { italian: 'madre', english: 'mother', word_type: 'noun', article: 'la', gender: 'f', plural: 'madri' },
      { italian: 'fratello', english: 'brother', word_type: 'noun', article: 'il', gender: 'm', plural: 'fratelli' },
      { italian: 'sorella', english: 'sister', word_type: 'noun', article: 'la', gender: 'f', plural: 'sorelle' },
      { italian: 'nonno', english: 'grandfather', word_type: 'noun', article: 'il', gender: 'm', plural: 'nonni' },
      { italian: 'nonna', english: 'grandmother', word_type: 'noun', article: 'la', gender: 'f', plural: 'nonne' },
      { italian: 'marito', english: 'husband', word_type: 'noun', article: 'il', gender: 'm', plural: 'mariti' },
      { italian: 'moglie', english: 'wife', word_type: 'noun', article: 'la', gender: 'f', plural: 'mogli' },
      { italian: 'figlio', english: 'son', word_type: 'noun', article: 'il', gender: 'm', plural: 'figli' },
      { italian: 'figlia', english: 'daughter', word_type: 'noun', article: 'la', gender: 'f', plural: 'figlie' },
      { italian: 'zio', english: 'uncle', word_type: 'noun', article: 'lo', gender: 'm', plural: 'zii' },
      { italian: 'zia', english: 'aunt', word_type: 'noun', article: 'la', gender: 'f', plural: 'zie' },
      { italian: 'cugino', english: 'cousin (m)', word_type: 'noun', article: 'il', gender: 'm', plural: 'cugini' },
      { italian: 'cugina', english: 'cousin (f)', word_type: 'noun', article: 'la', gender: 'f', plural: 'cugine' },
      // University subjects
      { italian: 'matematica', english: 'mathematics', word_type: 'noun', article: 'la', gender: 'f', plural: 'matematiche' },
      { italian: 'storia', english: 'history', word_type: 'noun', article: 'la', gender: 'f', plural: 'storie' },
      { italian: 'biologia', english: 'biology', word_type: 'noun', article: 'la', gender: 'f', plural: 'biologie' },
      { italian: 'economia', english: 'economics', word_type: 'noun', article: "l'", gender: 'f', plural: 'economie' },
      { italian: 'filosofia', english: 'philosophy', word_type: 'noun', article: 'la', gender: 'f', plural: 'filosofie' },
      { italian: 'letteratura', english: 'literature', word_type: 'noun', article: 'la', gender: 'f', plural: 'letterature' },
      // -are verbs
      {
        italian: 'parlare', english: 'to speak / to talk', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' } },
      },
      {
        italian: 'studiare', english: 'to study', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'studio', tu: 'studi', 'lui/lei': 'studia', noi: 'studiamo', voi: 'studiate', loro: 'studiano' } },
      },
      {
        italian: 'lavorare', english: 'to work', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'lavoro', tu: 'lavori', 'lui/lei': 'lavora', noi: 'lavoriamo', voi: 'lavorate', loro: 'lavorano' } },
      },
      {
        italian: 'abitare', english: 'to live / to reside', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'abito', tu: 'abiti', 'lui/lei': 'abita', noi: 'abitiamo', voi: 'abitate', loro: 'abitano' } },
      },
      {
        italian: 'mangiare', english: 'to eat', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'mangio', tu: 'mangi', 'lui/lei': 'mangia', noi: 'mangiamo', voi: 'mangiate', loro: 'mangiano' } },
      },
      {
        italian: 'ascoltare', english: 'to listen', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'ascolto', tu: 'ascolti', 'lui/lei': 'ascolta', noi: 'ascoltiamo', voi: 'ascoltate', loro: 'ascoltano' } },
      },
      {
        italian: 'guardare', english: 'to watch / to look at', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'guardo', tu: 'guardi', 'lui/lei': 'guarda', noi: 'guardiamo', voi: 'guardate', loro: 'guardano' } },
      },
      {
        italian: 'chiamare', english: 'to call', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'chiamo', tu: 'chiami', 'lui/lei': 'chiama', noi: 'chiamiamo', voi: 'chiamate', loro: 'chiamano' } },
      },
    ],
  },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function seedChapter(chapterData: SeedSet) {
  console.log(`\nSeeding: ${chapterData.title}`)

  // Create set
  const { data: setRow, error: setErr } = await db
    .from('sets')
    .insert({
      title: chapterData.title,
      description: chapterData.description,
      category: 'general',
      sort_order: chapterData.sort_order,
    })
    .select('id')
    .single()
  if (setErr) throw setErr

  const setId = setRow.id
  let count = 0

  for (let i = 0; i < chapterData.cards.length; i++) {
    const c = chapterData.cards[i]
    const { error } = await db.from('cards').insert({
      set_id:          setId,
      italian:         c.italian,
      english:         c.english,
      word_type:       c.word_type,
      article:         c.article ?? null,
      gender:          c.gender ?? null,
      plural:          c.plural ?? null,
      tense:           c.tense ?? null,
      conjugations:    c.conjugations ?? null,
      adjective_forms: c.adjective_forms ?? null,
      chapter:         chapterData.chapter,
      sort_order:      i + 1,
      enabled:         true,
    })
    if (error) {
      console.error(`  ✗ ${c.italian}: ${error.message}`)
    } else {
      count++
    }
    await sleep(30)
  }

  console.log(`  ✓ ${count}/${chapterData.cards.length} cards seeded`)
  return count
}

async function main() {
  const chapterArg = process.argv.includes('--chapter')
    ? parseInt(process.argv[process.argv.indexOf('--chapter') + 1], 10)
    : null

  const toSeed = chapterArg
    ? CHAPTERS.filter(c => c.chapter === chapterArg)
    : CHAPTERS

  if (chapterArg && toSeed.length === 0) {
    console.error(`No data for chapter ${chapterArg}`)
    process.exit(1)
  }

  let totalCards = 0
  for (const chapterData of toSeed) {
    totalCards += await seedChapter(chapterData)
  }

  console.log(`\nDone. Seeded ${totalCards} cards across ${toSeed.length} set(s).`)
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-chapters.ts
git commit -m "feat: add seed-chapters script for Prego Ch 1-3 vocabulary"
```

---

### Task 10: Update Backfill Examples Script

**Goal:** Replace the broken Google Translate backfill with Claude via the Anthropic SDK directly (no API route needed — cleaner for batch processing).

**Files:**
- Modify: `scripts/backfill-examples.ts`

**Acceptance Criteria:**
- [ ] Script uses `@anthropic-ai/sdk` instead of Google Translate
- [ ] Generated Italian sentences are grammatically correct
- [ ] Progress/error output format unchanged
- [ ] `ANTHROPIC_API_KEY` env var checked at startup

**Verify:** `npx tsx scripts/backfill-examples.ts --dry-run` → lists cards that would be processed without hitting Claude; `npx tsx scripts/backfill-examples.ts` → correct Italian sentences logged

**Steps:**

- [ ] **Step 1: Rewrite `scripts/backfill-examples.ts`**

Replace the entire file:

```typescript
/**
 * backfill-examples.ts
 *
 * Generates example sentences for cards that don't have one yet.
 * Uses Claude (Anthropic SDK) instead of Google Translate for accurate output.
 *
 * Run: npx tsx scripts/backfill-examples.ts
 *      npx tsx scripts/backfill-examples.ts --dry-run   (list only, no API calls)
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const DRY_RUN = process.argv.includes('--dry-run')

const SYSTEM_PROMPT = `You are an Italian language tutor helping beginners study.
Generate one short, natural example sentence (5–10 words) using the given Italian word.
Use only present-tense vocabulary appropriate for Prego! Italian chapter 1–3 level.
No subjunctive, conditional, or complex tenses.
Respond with JSON only: {"italian":"<sentence>","english":"<translation>"}
No markdown, no explanation, no extra keys.`

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateExample(italian: string, english: string): Promise<{ italian: string; english: string }> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Italian word: "${italian}" (English: "${english}")\nGenerate an example sentence using this word.`,
    }],
  })
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  return JSON.parse(raw) as { italian: string; english: string }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set in .env.local')

  console.log('Fetching cards without examples…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, english, conjugations, word_type')
    .is('example', null)
    .order('sort_order')

  if (error || !cards) throw error ?? new Error('No data returned')
  console.log(`Found ${cards.length} cards without examples.\n`)

  // Skip verb-conjugation cards (they have conjugation tables)
  const todo = cards.filter(c => !c.conjugations)
  const skipped = cards.length - todo.length
  console.log(`${skipped} conjugation cards skipped. Processing ${todo.length}…\n`)

  if (DRY_RUN) {
    todo.forEach(c => console.log(`  would process: ${c.italian} (${c.english})`))
    console.log('\nDry run complete — no API calls made.')
    return
  }

  let success = 0
  let failed = 0

  for (const card of todo) {
    try {
      const example = await generateExample(card.italian, card.english)

      const { error: err } = await db
        .from('cards')
        .update({ example })
        .eq('id', card.id)

      if (err) throw err

      console.log(`  ✓ ${card.italian} → "${example.italian}"`)
      success++

      await sleep(200) // rate limit buffer
    } catch (err) {
      console.error(`  ✗ ${card.italian}: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\n✓ ${success} examples generated, ${failed} failed, ${skipped} skipped.`)
}

main().catch(console.error)
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-examples.ts
git commit -m "feat: rewrite backfill-examples to use Claude instead of Google Translate"
```

---

### Task 11: Redesign FlashcardStudy

**Goal:** Add direction toggle support, word-type-specific card backs (noun/verb/adjective), restrict flipping to the blue bar only, and move answer buttons into the card bottom.

**Files:**
- Modify: `components/FlashcardStudy.tsx`
- Modify: `app/sets/[id]/flashcard/page.tsx` (pass `direction` search param)

**Acceptance Criteria:**
- [ ] `direction` prop accepted ('it-en' | 'en-it'), defaults to 'it-en'
- [ ] Card body click does NOT flip — only the blue bar flips
- [ ] Speaker button click does NOT flip the card
- [ ] Noun back shows article + gender badge + singular + plural form metadata row
- [ ] Verb back shows pronoun-labeled conjugation grid ("Conjugation — Present" header; io/tu/lui·lei left column, noi/voi/loro right)
- [ ] Adjective back shows ms/fs/mp/fp 2×2 grid
- [ ] Word type pill and chapter pill visible on card front
- [ ] Tense pill (purple) visible on verb card fronts
- [ ] Answer bar is inside the card: "← Don't know" full-left, "Got it →" full-right
- [ ] `npx tsc --noEmit` exits 0

**Verify:** Run dev server. Open a chapter set, navigate to Flashcards. Confirm: clicking card body does nothing; clicking blue bar flips; verb back shows pronoun grid; noun back shows metadata; answer bar is inside the card.

**Steps:**

- [ ] **Step 1: Rewrite `components/FlashcardStudy.tsx`**

Replace the entire file:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'
import SpeakButton from '@/components/SpeakButton'
import GenderBadge from '@/components/GenderBadge'

interface Props {
  setId: string
  cards: Card[]
  initialProgress: Record<string, boolean>
  direction?: 'it-en' | 'en-it'
}

async function saveProgress(cardId: string, known: boolean) {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, known }),
  })
}

function WordTypePill({ card }: { card: Card }) {
  if (!card.word_type && !card.chapter) return null
  const label = card.word_type
    ? card.word_type.charAt(0).toUpperCase() + card.word_type.slice(1)
    : null
  const chapterLabel = card.chapter ? `Ch. ${card.chapter}` : null
  return (
    <div className="flex gap-1.5 justify-center flex-wrap">
      {label && (
        <span className="text-xs font-bold uppercase tracking-wide bg-qz-subtle text-qz-secondary px-2.5 py-0.5 rounded-full">
          {label}{chapterLabel ? ` · ${chapterLabel}` : ''}
        </span>
      )}
      {!label && chapterLabel && (
        <span className="text-xs font-bold uppercase tracking-wide bg-qz-subtle text-qz-secondary px-2.5 py-0.5 rounded-full">
          {chapterLabel}
        </span>
      )}
    </div>
  )
}

function TensePill({ tense }: { tense?: string | null }) {
  if (!tense) return null
  return (
    <span className="text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
      {tense.charAt(0).toUpperCase() + tense.slice(1)}
    </span>
  )
}

function NounBack({ card }: { card: Card }) {
  return (
    <>
      {(card.article || card.gender || card.plural) && (
        <div className="flex items-center gap-2 text-sm text-qz-secondary flex-wrap justify-center mt-1">
          <GenderBadge gender={card.gender} />
          {card.article && <span className="font-medium text-qz-text">{card.article} {card.italian}</span>}
          {card.plural && <span className="text-qz-muted">· pl. <span className="font-medium text-qz-text">{card.plural}</span></span>}
        </div>
      )}
    </>
  )
}

function VerbBack({ card }: { card: Card }) {
  const present = card.conjugations?.present
  if (!present) return null
  const left: (keyof typeof present)[]  = ['io', 'tu', 'lui/lei']
  const right: (keyof typeof present)[] = ['noi', 'voi', 'loro']
  return (
    <div className="mt-3 w-full max-w-xs border-t border-qz-border pt-3">
      <p className="text-xs text-qz-muted uppercase tracking-wide font-semibold mb-2 text-center">
        Conjugation — {card.tense ? card.tense.charAt(0).toUpperCase() + card.tense.slice(1) : 'Present'}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {left.map((p, i) => (
          <div key={p} className="contents">
            <div className="flex gap-1.5 items-baseline">
              <span className="text-qz-secondary text-xs w-10 text-right flex-shrink-0">{p}</span>
              <span className="font-semibold text-qz-text">{present[p]}</span>
            </div>
            <div className="flex gap-1.5 items-baseline">
              <span className="text-qz-secondary text-xs w-10 text-right flex-shrink-0">{right[i]}</span>
              <span className="font-semibold text-qz-text">{present[right[i]]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdjectiveBack({ card }: { card: Card }) {
  const f = card.adjective_forms
  if (!f) return null
  return (
    <div className="mt-3 w-full max-w-xs border-t border-qz-border pt-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(['ms', 'fs', 'mp', 'fp'] as const).map(key => (
          <div key={key} className="flex flex-col items-center bg-qz-subtle rounded-lg py-1.5 px-2">
            <span className="text-xs text-qz-muted uppercase tracking-wide">{key}</span>
            <span className="font-semibold text-qz-text">{f[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExampleBlock({ example }: { example: { italian: string; english: string } }) {
  return (
    <div className="mt-3 border-t border-qz-border pt-3 w-full max-w-sm text-left">
      <p className="text-xs text-qz-muted uppercase tracking-wide font-semibold mb-1">Example</p>
      <div className="flex items-start gap-1">
        <p className="text-sm text-qz-text italic flex-1">{example.italian}</p>
        <SpeakButton text={example.italian} size="sm" />
      </div>
      <p className="text-xs text-qz-secondary mt-0.5">{example.english}</p>
    </div>
  )
}

export default function FlashcardStudy({ setId, cards, initialProgress, direction = 'it-en' }: Props) {
  const router = useRouter()
  const [deck] = useState(() => shuffleArray(cards.filter(c => c.enabled !== false)))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>(initialProgress)
  const [done, setDone] = useState(false)

  const currentCard = deck[index]

  const advance = useCallback((known: boolean) => {
    saveProgress(currentCard.id, known)
    setResults(prev => ({ ...prev, [currentCard.id]: known }))
    setFlipped(false)
    if (index + 1 >= deck.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }, [currentCard, index, deck.length])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFlipped(f => !f)
      } else if (e.key === 'ArrowRight' && flipped) {
        advance(true)
      } else if (e.key === 'ArrowLeft' && flipped) {
        advance(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, advance])

  if (done) {
    const knownCount = Object.values(results).filter(Boolean).length
    const unknownCount = deck.length - knownCount
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <div className="flex gap-8 text-lg">
          <div className="text-qz-blue font-semibold">✓ {knownCount} known</div>
          <div className="text-red-600 font-semibold">✗ {unknownCount} unknown</div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setDone(false) }}
            className="px-6 py-2.5 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors"
          >
            Study Again
          </button>
          <button
            onClick={() => router.push(`/sets/${setId}`)}
            className="px-6 py-2.5 border-2 border-qz-border rounded-full text-qz-secondary font-medium hover:border-qz-blue hover:text-qz-blue cursor-pointer transition-colors"
          >
            Back to Set
          </button>
        </div>
      </div>
    )
  }

  const frontWord   = direction === 'it-en' ? currentCard.italian : currentCard.english
  const backWord    = direction === 'it-en' ? currentCard.english : currentCard.italian
  const isVerb      = currentCard.word_type === 'verb'
  const isNoun      = currentCard.word_type === 'noun'
  const isAdjective = currentCard.word_type === 'adjective'

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-sm text-qz-secondary mb-3">
          <span>{index + 1} / {deck.length}</span>
          <span className="text-qz-blue font-medium">{Object.values(results).filter(Boolean).length} known</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5 mb-4">
          <div
            className="bg-qz-blue h-1.5 rounded-full transition-all"
            style={{ width: `${(index / deck.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-2xl bg-white border-2 border-qz-border rounded-2xl select-none min-h-[340px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-3">
          {!flipped ? (
            /* FRONT */
            <>
              <WordTypePill card={currentCard} />
              {isVerb && <TensePill tense={currentCard.tense} />}
              <div className="flex items-center gap-2 justify-center">
                <div className="text-3xl font-bold text-qz-text">{frontWord}</div>
                {direction === 'it-en' && (
                  <SpeakButton
                    text={currentCard.italian}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            </>
          ) : (
            /* BACK */
            <>
              {/* Italian reminder at top with speaker */}
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-sm text-qz-secondary">{currentCard.italian}</span>
                <SpeakButton text={currentCard.italian} size="sm" onClick={e => e.stopPropagation()} />
              </div>

              {/* Main back word */}
              <div className="text-3xl font-bold text-qz-text">{backWord}</div>

              {/* Type-specific content */}
              {isNoun      && <NounBack card={currentCard} />}
              {isVerb      && <VerbBack card={currentCard} />}
              {isAdjective && <AdjectiveBack card={currentCard} />}

              {/* Example sentence */}
              {currentCard.example && <ExampleBlock example={currentCard.example} />}
            </>
          )}
        </div>

        {/* Bottom bar */}
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="bg-qz-blue text-white text-sm font-semibold text-center py-3 cursor-pointer w-full hover:bg-qz-blue-dark transition-colors"
          >
            Tap to flip
          </button>
        ) : (
          <div className="flex border-t-2 border-qz-border">
            <button
              onClick={() => advance(false)}
              className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left pl-5"
            >
              ← Don&apos;t know
            </button>
            <div className="w-0.5 bg-qz-border" />
            <button
              onClick={() => advance(true)}
              className="flex-1 py-3 text-sm font-bold text-qz-blue hover:bg-qz-blue-light transition-colors cursor-pointer text-right pr-5"
            >
              Got it →
            </button>
          </div>
        )}
      </div>

      {!flipped && (
        <p className="text-xs text-qz-secondary">press space to flip · ← → to answer after flipping</p>
      )}
    </div>
  )
}
```

Note: The `SpeakButton` component needs an `onClick` prop to stop propagation. Check `components/SpeakButton.tsx` — if it doesn't forward `onClick`, add `onClick?: React.MouseEventHandler<HTMLButtonElement>` to its props and pass it to the `<button>`. This prevents the speaker from accidentally doing anything when the card parent might have handlers.

- [ ] **Step 2: Update `app/sets/[id]/flashcard/page.tsx` to pass direction**

Replace the page component signature and the FlashcardStudy render:

```typescript
export default async function FlashcardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const { id } = await params
  const { direction: dirParam } = await searchParams
  const direction = dirParam === 'en-it' ? 'en-it' : 'it-en'

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) notFound()

  const data: SetWithCards = await res.json()

  if (data.cards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">This set has no cards yet.</p>
        <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">Add some cards</Link>
      </div>
    )
  }

  const initialProgress = Object.fromEntries(data.progress.map(p => [p.card_id, p.known]))

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {data.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Flashcards</span>
      </div>
      <FlashcardStudy setId={id} cards={data.cards} initialProgress={initialProgress} direction={direction} />
    </div>
  )
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/FlashcardStudy.tsx app/sets/\[id\]/flashcard/page.tsx
git commit -m "feat: redesign FlashcardStudy with direction toggle, word-type card backs, flip-bar-only"
```

---

### Task 12: Add StudyModePicker to Set Detail Page

**Goal:** Extract the study mode links into a `StudyModePicker` client component that hosts the direction toggle. Update the set detail page to render it.

**Files:**
- Create: `components/StudyModePicker.tsx`
- Modify: `app/sets/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Direction toggle (IT→EN / EN→IT) appears above Flashcards and Sentence Practice links
- [ ] Flashcard link includes `?direction=...` param
- [ ] Sentence Practice link appears with `?direction=...` param
- [ ] All other modes (Quiz, Match, Listening, Review) remain functional
- [ ] `npx tsc --noEmit` exits 0

**Verify:** Open set detail page. Toggle switches between 🇮🇹→🇺🇸 and 🇺🇸→🇮🇹. Clicking Flashcards navigates to the correct URL with direction param. Sentence Practice link is visible.

**Steps:**

- [ ] **Step 1: Create `components/StudyModePicker.tsx`**

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  setId: string
  canStudyMulti: boolean
  dueCount: number
}

export default function StudyModePicker({ setId, canStudyMulti, dueCount }: Props) {
  const [direction, setDirection] = useState<'it-en' | 'en-it'>('it-en')

  return (
    <div className="flex flex-col gap-3">
      {/* Direction toggle */}
      <div className="bg-white border-2 border-qz-border rounded-2xl p-4" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
        <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-3">Study direction</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDirection('it-en')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              direction === 'it-en'
                ? 'bg-qz-blue text-white'
                : 'border-2 border-qz-border text-qz-secondary hover:border-qz-blue hover:text-qz-blue'
            }`}
          >
            🇮🇹 Italian → English
          </button>
          <button
            onClick={() => setDirection('en-it')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              direction === 'en-it'
                ? 'bg-qz-blue text-white'
                : 'border-2 border-qz-border text-qz-secondary hover:border-qz-blue hover:text-qz-blue'
            }`}
          >
            🇺🇸 English → Italian
          </button>
        </div>
      </div>

      <Link
        href={`/sets/${setId}/flashcard?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-3xl">🃏</span>
        <div>
          <div className="font-semibold text-qz-text">Flashcards</div>
          <div className="text-sm text-qz-secondary">Flip cards, mark what you know</div>
        </div>
      </Link>

      <Link
        href={`/sets/${setId}/sentence-practice?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-3xl">💬</span>
        <div>
          <div className="font-semibold text-qz-text">Sentence Practice</div>
          <div className="text-sm text-qz-secondary">Fill-in-blank, dialogue, and translation</div>
        </div>
      </Link>

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/quiz`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">📝</span>
          <div><div className="font-semibold text-qz-text">Quiz</div><div className="text-sm text-qz-secondary">Multiple choice questions</div></div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-3xl">📝</span>
          <div><div className="font-semibold text-qz-secondary">Quiz</div><div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div></div>
        </div>
      )}

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/match`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🎯</span>
          <div><div className="font-semibold text-qz-text">Match</div><div className="text-sm text-qz-secondary">Click to pair Italian with English</div></div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-3xl">🎯</span>
          <div><div className="font-semibold text-qz-secondary">Match</div><div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div></div>
        </div>
      )}

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/listening`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🎧</span>
          <div><div className="font-semibold text-qz-text">Listening</div><div className="text-sm text-qz-secondary">Hear Italian, pick the meaning</div></div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-3xl">🎧</span>
          <div><div className="font-semibold text-qz-secondary">Listening</div><div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div></div>
        </div>
      )}

      <Link
        href={`/sets/${setId}/review`}
        className="flex items-center gap-4 bg-white border-2 border-qz-blue rounded-2xl p-5 hover:bg-qz-blue-light transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-3xl">🔁</span>
        <div className="flex-1">
          <div className="font-semibold text-qz-blue">Review Due Cards</div>
          <div className="text-sm text-qz-secondary">Spaced repetition — study what matters</div>
        </div>
        {dueCount > 0 && (
          <span className="bg-qz-blue text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {dueCount} due
          </span>
        )}
      </Link>

      <Link
        href={`/sets/${setId}/edit`}
        className="text-center py-3 text-sm font-medium text-qz-secondary border-2 border-qz-border rounded-2xl hover:border-qz-blue hover:text-qz-blue transition-colors"
      >
        Edit this set
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/sets/[id]/page.tsx`**

Replace the inline `<div className="flex flex-col gap-3">` block (lines 63–165) with:

```typescript
import StudyModePicker from '@/components/StudyModePicker'

// ... (keep everything above the return's flex flex-col gap-3 div unchanged) ...

// Replace the entire <div className="flex flex-col gap-3"> ... </div> block with:
<StudyModePicker setId={id} canStudyMulti={canStudyMulti} dueCount={dueCount} />
```

Also add the import at the top of the file.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/StudyModePicker.tsx app/sets/\[id\]/page.tsx
git commit -m "feat: add StudyModePicker with direction toggle and Sentence Practice link"
```

---

### Task 13: `/api/sentences/generate` Endpoint

**Goal:** Claude-powered endpoint that generates a 10-question Sentence Practice session for a set, stores results in the `sentences` table for reuse, and returns the full session data.

**Files:**
- Create: `app/api/sentences/generate/route.ts`

**Acceptance Criteria:**
- [ ] POST with `{ setId }` returns `{ questions: SentencePracticeQuestion[] }` (10 items)
- [ ] Questions mix fill_blank (4), dialogue (3), translation (3) — Claude decides exact mix
- [ ] Generated questions saved to `sentences` table with `set_id`
- [ ] Second call for same `setId` returns cached sentences (no Claude call)
- [ ] Returns 400 if setId missing, 404 if set not found
- [ ] `npx tsc --noEmit` exits 0

**Verify:** POST to `/api/sentences/generate` with a valid `setId` (with the cookie set) → returns 10 questions; second call returns same questions without delay.

**Steps:**

- [ ] **Step 1: Create `app/api/sentences/generate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type FillBlankQuestion = {
  id: string
  type: 'fill_blank'
  italian: string
  english: string
  blankWord: string
  options: string[]
  grammarNote: string
}

export type DialogueQuestion = {
  id: string
  type: 'dialogue'
  lines: Array<{ speaker: string; italian: string; english: string }>
  question: { italian: string; english: string }
  options: string[]
  correct: string
}

export type TranslationQuestion = {
  id: string
  type: 'translation'
  italian: string
  english: string
  options: string[]
  correct: string
  grammarNote: string
}

export type SentencePracticeQuestion = FillBlankQuestion | DialogueQuestion | TranslationQuestion

const SYSTEM_PROMPT = `You are an Italian language teacher creating practice exercises for Prego! chapter 1–3 beginners.
Generate exactly 10 questions mixing three formats: fill_blank (4), dialogue (3), translation (3).
Use ONLY the vocabulary words provided. Keep sentences 5–10 words, present tense only. No subjunctive, conditional, or past tense unless a passato prossimo card is in the list.

Return ONLY valid JSON with this exact shape:
{
  "questions": [
    {
      "type": "fill_blank",
      "italian": "Io ___ uno zaino.",
      "english": "I have a backpack.",
      "blank_word": "ho",
      "options": ["ho", "hai", "ha", "abbiamo"],
      "grammar_note": "Avere — io ho"
    },
    {
      "type": "dialogue",
      "lines": [
        { "speaker": "Marco", "italian": "Ciao! Come stai?", "english": "Hi! How are you?" },
        { "speaker": "Sara", "italian": "Sto bene, grazie.", "english": "I'm well, thank you." }
      ],
      "question": { "italian": "Come sta Sara?", "english": "How is Sara?" },
      "options": ["Ha fame.", "Sta bene.", "È stanca."],
      "correct": "Sta bene."
    },
    {
      "type": "translation",
      "italian": "Lei è alta e intelligente.",
      "english": "She is tall and intelligent.",
      "options": ["Lei è alto e intelligente.", "Lei è alta e intelligente.", "Lui è alta e intelligente."],
      "correct": "Lei è alta e intelligente.",
      "grammar_note": "alta — feminine singular of alto"
    }
  ]
}

Rules:
- fill_blank: blank a verb form, noun, or adjective — never blank articles or prepositions. Use ___ as the placeholder.
- options array must contain exactly 4 items for fill_blank, 3 items for dialogue and translation. Include the correct answer.
- dialogue: write natural beginner exchanges; 2 speakers, 2–3 lines each. The question must be answerable from the dialogue.
- translation: include one subtle grammar trap (gender agreement, word order, ser vs. stare).
- All content must be beginner-appropriate (Prego ch. 1–3 level).`

export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { setId } = await req.json() as { setId?: string }
  if (!setId) return NextResponse.json({ error: 'setId is required' }, { status: 400 })

  const db = createServerClient()

  // Check for cached sentences
  const { data: cached } = await db
    .from('sentences')
    .select('id, type, italian, english, metadata')
    .eq('set_id', setId)
    .in('type', ['fill_blank', 'dialogue', 'translation'])
    .order('created_at', { ascending: true })

  if (cached && cached.length >= 10) {
    return NextResponse.json({ questions: rowsToQuestions(cached) })
  }

  // Fetch set + cards for context
  const { data: cards } = await db
    .from('cards')
    .select('id, italian, english, word_type, chapter')
    .eq('set_id', setId)
    .eq('enabled', true)

  if (!cards || cards.length === 0) {
    return NextResponse.json({ error: 'Set not found or has no enabled cards' }, { status: 404 })
  }

  const vocab = cards.map(c => `${c.italian} (${c.english})`).join(', ')

  // Generate with Claude
  let rawJson: string
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Vocabulary for this set: ${vocab}\n\nGenerate 10 practice questions using this vocabulary.`,
      }],
    })
    rawJson = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  let parsed: { questions: Array<Record<string, unknown>> }
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return NextResponse.json({ error: 'Claude returned invalid JSON', raw: rawJson }, { status: 500 })
  }

  // Delete old cached sentences for this set
  await db.from('sentences').delete().eq('set_id', setId).in('type', ['fill_blank', 'dialogue', 'translation'])

  // Save new sentences
  const cardMap = Object.fromEntries(cards.map(c => [c.italian.toLowerCase(), c.id]))

  const rows = parsed.questions.map(q => {
    if (q.type === 'fill_blank') {
      return {
        set_id:   setId,
        card_id:  cardMap[(q.blank_word as string)?.toLowerCase()] ?? null,
        type:     'fill_blank' as const,
        italian:  q.italian as string,
        english:  q.english as string,
        metadata: {
          blankWord:   q.blank_word,
          options:     q.options,
          grammarNote: q.grammar_note,
        },
      }
    } else if (q.type === 'dialogue') {
      const question = q.question as { italian: string; english: string }
      return {
        set_id:   setId,
        card_id:  null,
        type:     'dialogue' as const,
        italian:  question.italian,
        english:  question.english,
        metadata: {
          lines:   q.lines,
          question: q.question,
          options:  q.options,
          correct:  q.correct,
        },
      }
    } else {
      return {
        set_id:   setId,
        card_id:  cardMap[(q.italian as string)?.split(' ')[0]?.toLowerCase()] ?? null,
        type:     'translation' as const,
        italian:  q.italian as string,
        english:  q.english as string,
        metadata: {
          options:     q.options,
          correct:     q.correct,
          grammarNote: q.grammar_note,
        },
      }
    }
  })

  const { data: saved, error: saveErr } = await db
    .from('sentences')
    .insert(rows)
    .select('id, type, italian, english, metadata')

  if (saveErr || !saved) {
    return NextResponse.json({ error: saveErr?.message ?? 'Failed to save sentences' }, { status: 500 })
  }

  return NextResponse.json({ questions: rowsToQuestions(saved) })
}

function rowsToQuestions(rows: Array<{ id: string; type: string; italian: string; english: string; metadata: Record<string, unknown> }>): SentencePracticeQuestion[] {
  return rows.map(row => {
    const m = row.metadata ?? {}
    if (row.type === 'fill_blank') {
      return {
        id:          row.id,
        type:        'fill_blank',
        italian:     row.italian,
        english:     row.english,
        blankWord:   m.blankWord as string,
        options:     m.options as string[],
        grammarNote: m.grammarNote as string,
      } satisfies FillBlankQuestion
    } else if (row.type === 'dialogue') {
      return {
        id:       row.id,
        type:     'dialogue',
        lines:    m.lines as DialogueQuestion['lines'],
        question: m.question as DialogueQuestion['question'],
        options:  m.options as string[],
        correct:  m.correct as string,
      } satisfies DialogueQuestion
    } else {
      return {
        id:          row.id,
        type:        'translation',
        italian:     row.italian,
        english:     row.english,
        options:     m.options as string[],
        correct:     m.correct as string,
        grammarNote: m.grammarNote as string,
      } satisfies TranslationQuestion
    }
  }) as SentencePracticeQuestion[]
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/api/sentences/generate/route.ts"
git commit -m "feat: add /api/sentences/generate endpoint with Claude and caching"
```

---

### Task 14: SentencePractice Component

**Goal:** Build the interactive `SentencePractice` client component that renders all three question formats (fill-blank, dialogue, translation) with correct feedback and progress tracking.

**Files:**
- Create: `components/SentencePractice.tsx`

**Acceptance Criteria:**
- [ ] Fill-blank: shows Italian sentence with `___`, 2×2 option grid, feedback bar after answering, Next button
- [ ] Dialogue: shows dialogue box, eye button at top-right that toggles ALL English translations in dialogue AND question simultaneously, 3 answer options, Next button
- [ ] Translation: respects `direction` prop (IT→EN or EN→IT), shows source language prompt, 3 options, feedback bar
- [ ] Correct answer highlighted green, wrong answer highlighted red
- [ ] Progress bar at top tracks current question out of 10
- [ ] Score screen on completion
- [ ] `npx tsc --noEmit` exits 0

**Verify:** Run dev server. Navigate to Sentence Practice for a set. Verify all three question types render. Confirm eye toggle on dialogue shows/hides all translations. Confirm wrong answer shows red, correct shows green. Complete session and see score.

**Steps:**

- [ ] **Step 1: Create `components/SentencePractice.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FillBlankQuestion, DialogueQuestion, TranslationQuestion, SentencePracticeQuestion } from '@/app/api/sentences/generate/route'

interface Props {
  setId: string
  questions: SentencePracticeQuestion[]
  direction?: 'it-en' | 'en-it'
}

function FormatPill({ type }: { type: string }) {
  const styles: Record<string, string> = {
    fill_blank:  'bg-blue-100 text-blue-800',
    dialogue:    'bg-green-100 text-green-800',
    translation: 'bg-yellow-100 text-yellow-800',
  }
  const labels: Record<string, string> = {
    fill_blank:  'Fill in the blank',
    dialogue:    'Dialogue',
    translation: 'Translation',
  }
  return (
    <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${styles[type] ?? ''}`}>
      {labels[type] ?? type}
    </span>
  )
}

function FillBlankView({ q, selected, onAnswer, onNext }: {
  q: FillBlankQuestion
  selected: string | null
  onAnswer: (o: string) => void
  onNext: () => void
}) {
  const parts = q.italian.split('___')
  const isCorrect = selected === q.blankWord

  return (
    <>
      <FormatPill type="fill_blank" />
      <div className="text-xl font-semibold text-qz-text leading-relaxed mt-2 mb-1">
        {parts[0]}
        <span className="inline-block min-w-[80px] h-7 border-b-2 border-qz-blue bg-qz-blue-light rounded-t mx-1 align-middle" />
        {parts[1]}
      </div>
      <p className="text-sm text-qz-muted italic mb-5">{q.english}</p>
      <div className="grid grid-cols-2 gap-2.5 mb-2 w-full max-w-xs">
        {q.options.map(opt => {
          let cls = 'border-2 border-qz-border rounded-xl py-2.5 text-sm font-semibold text-qz-text bg-white cursor-pointer hover:border-qz-blue hover:text-qz-blue transition-colors'
          if (selected) {
            if (opt === q.blankWord) cls = 'border-2 border-green-500 rounded-xl py-2.5 text-sm font-semibold text-green-700 bg-green-50'
            else if (opt === selected) cls = 'border-2 border-red-500 rounded-xl py-2.5 text-sm font-semibold text-red-700 bg-red-50'
            else cls = 'border-2 border-qz-border rounded-xl py-2.5 text-sm font-semibold text-qz-secondary bg-white opacity-50'
          }
          return (
            <button key={opt} onClick={() => !selected && onAnswer(opt)} className={cls} disabled={!!selected}>
              {opt}
            </button>
          )
        })}
      </div>
      {selected && (
        <div className={`flex items-center gap-2 w-full max-w-xs px-4 py-2.5 rounded-xl text-sm font-semibold ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{isCorrect ? '✓ Correct!' : '✗ Wrong'}</span>
          {q.grammarNote && <em className="font-normal ml-1">{q.grammarNote}</em>}
          <button onClick={onNext} className="ml-auto bg-qz-blue text-white text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-qz-blue-dark transition-colors whitespace-nowrap">
            Next →
          </button>
        </div>
      )}
    </>
  )
}

function DialogueView({ q, selected, onAnswer, onNext, translationsVisible, onToggleTranslations }: {
  q: DialogueQuestion
  selected: string | null
  onAnswer: (o: string) => void
  onNext: () => void
  translationsVisible: boolean
  onToggleTranslations: () => void
}) {
  const isCorrect = selected === q.correct

  return (
    <>
      {/* Header row: pill left, eye right */}
      <div className="flex items-center justify-between w-full max-w-sm mb-3">
        <FormatPill type="dialogue" />
        <button
          onClick={onToggleTranslations}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors cursor-pointer ${
            translationsVisible ? 'bg-qz-blue-light text-qz-blue' : 'bg-qz-subtle text-qz-secondary hover:bg-qz-border'
          }`}
        >
          👁 {translationsVisible ? 'Hide translations' : 'Show translations'}
        </button>
      </div>

      {/* Dialogue box */}
      <div className="bg-qz-subtle border border-qz-border rounded-xl p-4 w-full max-w-sm mb-4 text-left">
        {q.lines.map((line, i) => (
          <div key={i} className={`flex gap-2.5 ${i < q.lines.length - 1 ? 'mb-3' : ''}`}>
            <span className="text-xs font-bold text-qz-secondary uppercase tracking-wide min-w-[52px] pt-0.5">{line.speaker}</span>
            <div>
              <p className="text-sm text-qz-text">{line.italian}</p>
              {translationsVisible && <p className="text-xs text-qz-muted italic mt-0.5">{line.english}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Question */}
      <p className="text-base font-semibold text-qz-text mb-1 w-full max-w-sm text-left">{q.question.italian}</p>
      {translationsVisible && <p className="text-xs text-qz-muted italic mb-3 w-full max-w-sm text-left">{q.question.english}</p>}
      {!translationsVisible && <div className="mb-3" />}

      {/* Options */}
      <div className="flex flex-col gap-2 w-full max-w-sm mb-2">
        {q.options.map(opt => {
          let cls = 'w-full border-2 border-qz-border rounded-xl px-4 py-2.5 text-sm font-medium text-qz-text bg-white cursor-pointer text-left hover:border-qz-blue hover:text-qz-blue transition-colors'
          if (selected) {
            if (opt === q.correct) cls = 'w-full border-2 border-green-500 rounded-xl px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 text-left'
            else if (opt === selected) cls = 'w-full border-2 border-red-500 rounded-xl px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 text-left'
            else cls = 'w-full border-2 border-qz-border rounded-xl px-4 py-2.5 text-sm font-medium text-qz-secondary bg-white opacity-50 text-left'
          }
          return (
            <button key={opt} onClick={() => !selected && onAnswer(opt)} className={cls} disabled={!!selected}>
              {opt}
            </button>
          )
        })}
      </div>
      {selected && (
        <div className={`flex items-center gap-2 w-full max-w-sm px-4 py-2.5 rounded-xl text-sm font-semibold ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          <button onClick={onNext} className="ml-auto bg-qz-blue text-white text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-qz-blue-dark transition-colors whitespace-nowrap">
            Next →
          </button>
        </div>
      )}
    </>
  )
}

function TranslationView({ q, selected, onAnswer, onNext, direction }: {
  q: TranslationQuestion
  selected: string | null
  onAnswer: (o: string) => void
  onNext: () => void
  direction: 'it-en' | 'en-it'
}) {
  const prompt      = direction === 'it-en' ? q.italian : q.english
  const hint        = direction === 'it-en' ? 'Choose the correct English translation ↓' : 'Choose the correct Italian translation ↓'
  const isCorrect   = selected === q.correct

  return (
    <>
      <FormatPill type="translation" />
      <p className="text-xl font-semibold text-qz-text mt-3 mb-1.5 w-full max-w-sm text-left">{prompt}</p>
      <p className="text-xs text-qz-muted mb-4 w-full max-w-sm text-left">{hint}</p>
      <div className="flex flex-col gap-2 w-full max-w-sm mb-2">
        {q.options.map(opt => {
          let cls = 'w-full border-2 border-qz-border rounded-xl px-4 py-2.5 text-sm font-medium text-qz-text bg-white cursor-pointer text-left hover:border-qz-blue hover:text-qz-blue transition-colors'
          if (selected) {
            if (opt === q.correct) cls = 'w-full border-2 border-green-500 rounded-xl px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 text-left'
            else if (opt === selected) cls = 'w-full border-2 border-red-500 rounded-xl px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 text-left'
            else cls = 'w-full border-2 border-qz-border rounded-xl px-4 py-2.5 text-sm font-medium text-qz-secondary bg-white opacity-50 text-left'
          }
          return (
            <button key={opt} onClick={() => !selected && onAnswer(opt)} className={cls} disabled={!!selected}>
              {opt}
            </button>
          )
        })}
      </div>
      {selected && (
        <div className={`flex items-center gap-2 w-full max-w-sm px-4 py-2.5 rounded-xl text-sm font-semibold ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {isCorrect ? '✓ Right!' : '✗ Wrong'}
          {q.grammarNote && <em className="font-normal ml-1">{q.grammarNote}</em>}
          <button onClick={onNext} className="ml-auto bg-qz-blue text-white text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-qz-blue-dark transition-colors whitespace-nowrap">
            Next →
          </button>
        </div>
      )}
    </>
  )
}

export default function SentencePractice({ setId, questions, direction = 'it-en' }: Props) {
  const router = useRouter()
  const [index, setIndex]                         = useState(0)
  const [selected, setSelected]                   = useState<string | null>(null)
  const [translationsVisible, setTranslations]    = useState(false)
  const [score, setScore]                         = useState(0)
  const [done, setDone]                           = useState(false)

  const q = questions[index]

  function isCorrectAnswer(option: string): boolean {
    if (q.type === 'fill_blank')  return option === q.blankWord
    if (q.type === 'dialogue')    return option === q.correct
    if (q.type === 'translation') return option === q.correct
    return false
  }

  function handleAnswer(option: string) {
    if (selected) return
    setSelected(option)
    if (isCorrectAnswer(option)) setScore(s => s + 1)
  }

  function next() {
    setSelected(null)
    setTranslations(false)
    if (index + 1 >= questions.length) setDone(true)
    else setIndex(i => i + 1)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <p className="text-lg text-qz-secondary">
          <span className="font-bold text-qz-blue">{score}</span> / {questions.length} correct
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setSelected(null); setScore(0); setDone(false) }}
            className="px-6 py-2.5 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push(`/sets/${setId}`)}
            className="px-6 py-2.5 border-2 border-qz-border rounded-full text-qz-secondary font-medium hover:border-qz-blue hover:text-qz-blue cursor-pointer transition-colors"
          >
            Back to Set
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Progress */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-sm text-qz-secondary mb-2">
          <span>Question {index + 1} of {questions.length}</span>
          <span className="text-qz-blue font-medium">{score} correct</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5">
          <div className="bg-qz-blue h-1.5 rounded-full transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="w-full max-w-sm bg-white border-2 border-qz-border rounded-2xl p-6 flex flex-col items-center" style={{ boxShadow: 'var(--qz-shadow-card)' }}>
        {q.type === 'fill_blank' && (
          <FillBlankView q={q} selected={selected} onAnswer={handleAnswer} onNext={next} />
        )}
        {q.type === 'dialogue' && (
          <DialogueView
            q={q}
            selected={selected}
            onAnswer={handleAnswer}
            onNext={next}
            translationsVisible={translationsVisible}
            onToggleTranslations={() => setTranslations(v => !v)}
          />
        )}
        {q.type === 'translation' && (
          <TranslationView q={q} selected={selected} onAnswer={handleAnswer} onNext={next} direction={direction} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/SentencePractice.tsx
git commit -m "feat: add SentencePractice component with fill-blank, dialogue, translation formats"
```

---

### Task 15: Sentence Practice Page

**Goal:** Create the server wrapper at `/sets/[id]/sentence-practice` that fetches the set, calls the generate endpoint, and renders the SentencePractice component.

**Files:**
- Create: `app/sets/[id]/sentence-practice/page.tsx`

**Acceptance Criteria:**
- [ ] Route exists and is accessible from the Sentence Practice link
- [ ] Reads `?direction` search param, defaults to `'it-en'`
- [ ] Calls `/api/sentences/generate` server-side to get questions
- [ ] Shows loading state if no questions returned
- [ ] `npx tsc --noEmit` exits 0

**Verify:** Navigate to `/sets/[id]/sentence-practice` from the set detail page. Questions load and render correctly. Dialogue eye toggle works. Translation direction matches toggle chosen on set detail page.

**Steps:**

- [ ] **Step 1: Create `app/sets/[id]/sentence-practice/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { isValidUserId } from '@/lib/users'
import SentencePractice from '@/components/SentencePractice'
import type { SentencePracticeQuestion } from '@/app/api/sentences/generate/route'

export default async function SentencePracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const { id } = await params
  const { direction: dirParam } = await searchParams
  const direction = dirParam === 'en-it' ? 'en-it' : 'it-en'

  // Fetch set title for breadcrumb
  const setRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!setRes.ok) notFound()
  const setData = await setRes.json()

  // Generate / fetch cached session
  const genRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sentences/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `userId=${userId}`,
    },
    body: JSON.stringify({ setId: id }),
    cache: 'no-store',
  })

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({ error: 'Unknown error' }))
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">Could not generate practice session: {err.error}</p>
        <Link href={`/sets/${id}`} className="text-qz-blue hover:underline">← Back to set</Link>
      </div>
    )
  }

  const { questions } = await genRes.json() as { questions: SentencePracticeQuestion[] }

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">No practice questions available for this set yet.</p>
        <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">Add more cards</Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {setData.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Sentence Practice</span>
      </div>
      <SentencePractice setId={id} questions={questions} direction={direction} />
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run dev server and test end-to-end**

```bash
npm run dev
```

Open http://localhost:3000. Log in as Chance. Run the seed script against a real Supabase project (or test with existing cards). Navigate to a set → Sentence Practice. Verify:
- Questions render for all three types
- Fill-blank: correct answer highlights green, wrong red
- Dialogue: eye toggle shows/hides ALL translations simultaneously (dialogue lines + question)
- Translation: direction toggle flows through from set detail page

- [ ] **Step 4: Commit**

```bash
git add "app/sets/[id]/sentence-practice/page.tsx"
git commit -m "feat: add Sentence Practice page server wrapper"
```

---

## Running the Full Content Reset

Once all tasks are complete, run the content reset and seed in order:

```bash
# 1. Apply DB migration 007 (via Supabase dashboard or MCP)

# 2. Delete all existing content
npx tsx scripts/reset-content.ts --confirm

# 3. Seed chapters 1–3
npx tsx scripts/seed-chapters.ts

# 4. Backfill example sentences (optional — can run in background)
npx tsx scripts/backfill-examples.ts
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Migration 007 (chapter/article/word_type/adjective_forms/tense) | Task 1 |
| Sentences table | Task 1 |
| TypeScript types updated | Task 2 |
| API cards PUT updated | Task 3 |
| /api/claude wrapper | Task 4 |
| /api/example → Claude | Task 5 |
| /api/plural → Claude | Task 6 |
| CardEditor new fields | Task 7 |
| Content reset script | Task 8 |
| Ch 1–3 seeding | Task 9 |
| Backfill examples with Claude | Task 10 |
| Direction toggle | Tasks 11, 12 |
| Word-type card backs | Task 11 |
| Flip bar only | Task 11 |
| Split answer buttons | Task 11 |
| Sentence Practice mode | Tasks 13, 14, 15 |
| Fill-blank format | Task 14 |
| Dialogue + eye toggle | Task 14 |
| Translation + direction | Task 14 |
| Cached sessions | Task 13 |
