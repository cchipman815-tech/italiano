# Saved Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Quick Translate results to a shared Supabase table so both users can browse and delete them from a dedicated `/saved` page.

**Architecture:** A new `saved_translations` Supabase table stores English+Italian pairs (shared, no user_id). Three API routes (GET/POST collection, DELETE by id) power the feature. `TranslatorWidget` auto-saves silently after each successful translation; the home page gains a bookmark card linking to a new `/saved` list page.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Postgres (`@supabase/supabase-js`), Tailwind CSS v4, React 19 `useState`

---

### Task 1: Supabase table + SavedTranslation type

**Goal:** Create the `saved_translations` table in Supabase and add the `SavedTranslation` TypeScript type to `lib/types.ts`.

**Files:**
- Modify: `lib/types.ts`

**Acceptance Criteria:**
- [ ] `saved_translations` table exists with columns: id (uuid PK), english (text not null), italian (text not null), created_at (timestamptz not null default now())
- [ ] Unique constraint `saved_translations_pair_unique` on (english, italian) exists
- [ ] `SavedTranslation` interface exported from `lib/types.ts`

**Verify:** Run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'saved_translations' ORDER BY ordinal_position;` via Supabase MCP → expect 4 rows (id, english, italian, created_at).

**Steps:**

- [ ] **Step 1: Find the Supabase project ID**

Use the Supabase MCP tool:
```
Tool: mcp__75d160c7-29f7-4143-a89d-aa50445e1490__list_projects
(no parameters needed)
```
Note the `id` field of the italiano project from the result.

- [ ] **Step 2: Create the table**

```
Tool: mcp__75d160c7-29f7-4143-a89d-aa50445e1490__execute_sql
projectId: <id from step 1>
query:
  CREATE TABLE IF NOT EXISTS saved_translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    english text NOT NULL,
    italian text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT saved_translations_pair_unique UNIQUE (english, italian)
  );
```

- [ ] **Step 3: Verify the schema**

```
Tool: mcp__75d160c7-29f7-4143-a89d-aa50445e1490__execute_sql
projectId: <id>
query: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'saved_translations' ORDER BY ordinal_position;
```
Expected output: 4 rows — id (uuid), english (text), italian (text), created_at (timestamp with time zone).

- [ ] **Step 4: Add `SavedTranslation` type to `lib/types.ts`**

Append at the end of `lib/types.ts`:

```ts
export interface SavedTranslation {
  id: string
  english: string
  italian: string
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add saved_translations table and SavedTranslation type"
```

---

### Task 2: GET + POST API route

**Goal:** Implement `GET /api/saved-translations` (list all, newest first) and `POST /api/saved-translations` (upsert on duplicate pair).

**Files:**
- Create: `app/api/saved-translations/route.ts`

**Acceptance Criteria:**
- [ ] `GET /api/saved-translations` with valid cookie returns 200 with array ordered newest first
- [ ] `GET /api/saved-translations` without valid cookie returns 401
- [ ] `POST /api/saved-translations` with `{ english, italian }` returns 201 with the upserted row
- [ ] `POST` with the same english+italian pair again returns 201 and updates `created_at`
- [ ] `POST` without english or italian field returns 400

**Verify:** Run `npm run dev`, then in a terminal:
```bash
# GET empty list
curl -s http://localhost:3000/api/saved-translations -H "Cookie: userId=1" | jq .
# → []

# POST a translation
curl -s -X POST http://localhost:3000/api/saved-translations \
  -H "Content-Type: application/json" -H "Cookie: userId=1" \
  -d '{"english":"dog","italian":"cane"}' | jq .
# → {"id":"...","english":"dog","italian":"cane","created_at":"..."}

# GET now returns 1 item
curl -s http://localhost:3000/api/saved-translations -H "Cookie: userId=1" | jq .

# 401 without cookie
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/saved-translations
# → 401

# 400 missing field
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/saved-translations \
  -H "Content-Type: application/json" -H "Cookie: userId=1" -d '{"english":"dog"}'
# → 400
```

**Steps:**

- [ ] **Step 1: Create `app/api/saved-translations/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function GET() {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const db = createServerClient()
  const { data, error } = await db
    .from('saved_translations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json() as { english?: string; italian?: string }
  const english = body.english?.trim()
  const italian = body.italian?.trim()

  if (!english || !italian) {
    return NextResponse.json({ error: 'Missing english or italian' }, { status: 400 })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('saved_translations')
    .upsert(
      { english, italian, created_at: new Date().toISOString() },
      { onConflict: 'english,italian' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verify with curl** (run the commands from the Verify section above)

- [ ] **Step 3: Commit**

```bash
git add app/api/saved-translations/route.ts
git commit -m "feat: add GET and POST /api/saved-translations"
```

---

### Task 3: DELETE API route

**Goal:** Implement `DELETE /api/saved-translations/[id]` to remove a saved translation by UUID.

**Files:**
- Create: `app/api/saved-translations/[id]/route.ts`

**Acceptance Criteria:**
- [ ] `DELETE /api/saved-translations/<uuid>` returns 204 and removes the row
- [ ] Returns 401 without a valid userId cookie

**Verify:**
```bash
# POST to get an id
ID=$(curl -s -X POST http://localhost:3000/api/saved-translations \
  -H "Content-Type: application/json" -H "Cookie: userId=1" \
  -d '{"english":"cat","italian":"gatto"}' | jq -r .id)

# DELETE it — expect 204
curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  http://localhost:3000/api/saved-translations/$ID -H "Cookie: userId=1"
# → 204

# Confirm gone from list
curl -s http://localhost:3000/api/saved-translations -H "Cookie: userId=1" | jq .
# → entry with italian:"gatto" is absent
```

**Steps:**

- [ ] **Step 1: Create `app/api/saved-translations/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()
  const { error } = await db.from('saved_translations').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Verify with curl** (run the commands from the Verify section above)

- [ ] **Step 3: Commit**

```bash
git add "app/api/saved-translations/[id]/route.ts"
git commit -m "feat: add DELETE /api/saved-translations/[id]"
```

---

### Task 4: TranslatorWidget auto-save

**Goal:** Modify `TranslatorWidget.tsx` so every successful translation is silently saved, with a brief "Saved ✓" indicator shown in the result card.

**Files:**
- Modify: `components/TranslatorWidget.tsx`

**Acceptance Criteria:**
- [ ] After EN→IT word translation, `POST /api/saved-translations` is called with `english` = original input, `italian` = translated result
- [ ] After EN→IT sentence translation, same
- [ ] After IT→EN translation, called with `english` = translated result, `italian` = original input
- [ ] "Saved ✓" in green appears in the result card after a successful save, disappears after 2 seconds
- [ ] "Saved ✓" resets when clearing input or starting a new translation
- [ ] Save failures are silent — no error shown to user

**Verify:** Run `npm run dev`. Go to http://localhost:3000/home. Type "cat" in EN→IT mode, click Translate. Confirm "Saved ✓" appears briefly in the result. Switch to IT→EN, type "il gatto", translate. Confirm "Saved ✓" appears. Run `curl -s http://localhost:3000/api/saved-translations -H "Cookie: userId=1" | jq .` — confirm both entries saved.

**Steps:**

- [ ] **Step 1: Replace `components/TranslatorWidget.tsx` with the updated version**

```tsx
'use client'
import { useState } from 'react'
import SpeakButton from '@/components/SpeakButton'

type WordResult = {
  type: 'word'
  italian: string
  article: string
  gender: 'm' | 'f'
  plural: string
  grammarNote: string
}

type SentenceResult = {
  type: 'sentence'
  italian: string
  literalNote: string
}

type ItEnResult = {
  type: 'it-en'
  italian: string
  english: string
}

type TranslateResult = WordResult | SentenceResult | ItEnResult

export default function TranslatorWidget() {
  const [direction, setDirection] = useState<'en-it' | 'it-en'>('en-it')
  const [input,     setInput]     = useState('')
  const [result,    setResult]    = useState<TranslateResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [saved,     setSaved]     = useState(false)

  function clearInput() {
    setInput('')
    setResult(null)
    setError('')
    setSaved(false)
  }

  function handleDirectionChange(dir: 'en-it' | 'it-en') {
    setDirection(dir)
    clearInput()
  }

  async function saveTranslation(english: string, italian: string) {
    try {
      const res = await fetch('/api/saved-translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english, italian }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      // silent failure — do not surface save errors to the user
    }
  }

  async function handleTranslate() {
    const trimmed = input.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      if (direction === 'it-en') {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, mode: 'it-en' }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(errData.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as { english?: string; error?: string }
        if (data.error) throw new Error(String(data.error))
        const english = String(data.english ?? '')
        setResult({ type: 'it-en', italian: trimmed, english })
        void saveTranslation(english, trimmed)
      } else {
        const mode = trimmed.includes(' ') ? 'sentence' : 'word'
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ english: trimmed, mode }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(errData.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as Record<string, unknown>
        if (data.error) throw new Error(String(data.error))
        if (mode === 'word') {
          const italian = String(data.italian ?? '')
          setResult({
            type: 'word',
            italian,
            article:     String(data.article     ?? ''),
            gender:      data.gender === 'f' ? 'f' : 'm',
            plural:      String(data.plural      ?? ''),
            grammarNote: String(data.grammarNote ?? ''),
          })
          void saveTranslation(trimmed, italian)
        } else {
          const italian = String(data.italian ?? '')
          setResult({
            type: 'sentence',
            italian,
            literalNote: String(data.literalNote ?? ''),
          })
          void saveTranslation(trimmed, italian)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const placeholder = direction === 'en-it'
    ? 'Type an English word or phrase…'
    : 'Type an Italian word or phrase…'

  const inputCls = 'w-full border-2 border-[#c5caff] rounded-xl px-3 py-2.5 text-qz-text text-sm placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white'

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: '#eef0ff', border: '1px solid #d5d9ff' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide">Quick Translate</p>
        <div className="flex gap-1 bg-white rounded-lg p-0.5 border border-[#d5d9ff]">
          <button
            onClick={() => handleDirectionChange('en-it')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              direction === 'en-it' ? 'bg-qz-blue text-white' : 'text-qz-secondary hover:text-qz-text'
            }`}
          >
            EN → IT
          </button>
          <button
            onClick={() => handleDirectionChange('it-en')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              direction === 'it-en' ? 'bg-qz-blue text-white' : 'text-qz-secondary hover:text-qz-text'
            }`}
          >
            IT → EN
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null); setError('') }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleTranslate()}
            placeholder={placeholder}
            className={inputCls}
          />
          {input && (
            <button
              onClick={clearInput}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-qz-muted hover:text-qz-secondary transition-colors cursor-pointer text-lg leading-none"
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={handleTranslate}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-qz-blue text-white text-sm font-semibold rounded-full hover:bg-qz-blue-dark disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
        >
          {loading ? 'Translating…' : 'Translate'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {result && (
        <div className="mt-4 bg-white border border-[#d5d9ff] rounded-xl p-4">
          {saved && (
            <p className="text-xs text-green-600 font-medium mb-2">Saved ✓</p>
          )}
          {result.type === 'it-en' ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <SpeakButton text={result.italian} size="sm" />
                <span className="text-sm text-qz-secondary italic">{result.italian}</span>
              </div>
              <span className="text-2xl font-bold text-qz-text">{result.english}</span>
            </>
          ) : result.type === 'word' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-qz-text">{result.italian}</span>
                <SpeakButton text={result.italian} />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {result.article && (
                  <span className="bg-qz-blue-light text-qz-blue text-xs font-semibold px-2.5 py-1 rounded-full">
                    {result.article}
                  </span>
                )}
                {result.article && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    result.gender === 'm' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                  }`}>
                    {result.gender === 'm' ? 'masculine' : 'feminine'}
                  </span>
                )}
                {result.plural && (
                  <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    pl. {result.plural}
                  </span>
                )}
              </div>
              {result.grammarNote && (
                <p className="text-xs text-qz-secondary italic">{result.grammarNote}</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-semibold text-qz-text">{result.italian}</span>
                <SpeakButton text={result.italian} />
              </div>
              {result.literalNote && (
                <p className="text-sm text-qz-secondary italic">{result.literalNote}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

1. `npm run dev`
2. Go to http://localhost:3000/home
3. Type "cat" in EN→IT, click Translate — "Saved ✓" appears briefly in green, then fades
4. Switch to IT→EN, type "il gatto", Translate — "Saved ✓" appears again
5. Verify in terminal: `curl -s http://localhost:3000/api/saved-translations -H "Cookie: userId=1" | jq .` → both entries present

- [ ] **Step 3: Commit**

```bash
git add components/TranslatorWidget.tsx
git commit -m "feat: auto-save translations with Saved ✓ indicator"
```

---

### Task 5: SavedTranslationsCard + home page count

**Goal:** Add a `SavedTranslationsCard` to the home page grid showing the saved count, linking to `/saved`.

**Files:**
- Create: `components/SavedTranslationsCard.tsx`
- Modify: `app/home/page.tsx`

**Acceptance Criteria:**
- [ ] Home page shows "Saved Translations" card at the end of the grid (after "New Set")
- [ ] Card shows correct count (e.g. "3 saved") or "No saves yet" when empty
- [ ] Clicking the card navigates to `/saved`
- [ ] Card is styled like `SetCard`: white background, rounded-2xl, border-2 border-qz-border, qz-shadow-card, hover:border-qz-blue

**Verify:** Go to http://localhost:3000/home. Confirm "Saved Translations" card is visible at the bottom of the grid with the correct count. Click it — confirm navigation to `/saved`.

**Steps:**

- [ ] **Step 1: Create `components/SavedTranslationsCard.tsx`**

```tsx
import Link from 'next/link'

interface Props {
  count: number
}

export default function SavedTranslationsCard({ count }: Props) {
  return (
    <Link
      href="/saved"
      className="bg-white rounded-2xl border-2 border-qz-border p-5 flex flex-col hover:border-qz-blue transition-colors"
      style={{ boxShadow: 'var(--qz-shadow-card)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-qz-blue-light flex items-center justify-center shrink-0">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-qz-blue"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-qz-text">Saved Translations</h2>
          <p className="text-sm text-qz-secondary">
            {count === 0 ? 'No saves yet' : `${count} saved`}
          </p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Replace `app/home/page.tsx` with the updated version**

```tsx
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SetCard from '@/components/SetCard'
import AppNav from '@/components/AppNav'
import TranslatorWidget from '@/components/TranslatorWidget'
import SavedTranslationsCard from '@/components/SavedTranslationsCard'
import { isValidUserId, getUserById } from '@/lib/users'
import type { SetWithProgress } from '@/lib/types'

async function getSets(userId: number): Promise<SetWithProgress[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

async function getSavedCount(userId: number): Promise<number> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/saved-translations`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return 0
  const data = await res.json() as Array<unknown>
  return data.length
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const user = getUserById(userId)
  const [sets, savedCount] = await Promise.all([getSets(userId), getSavedCount(userId)])

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <TranslatorWidget />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sets.map(set => (
            <SetCard key={set.id} set={set} />
          ))}
          <Link
            href="/sets/new"
            className="bg-white rounded-2xl border-2 border-dashed border-qz-border p-5 flex flex-col items-center justify-center gap-2 text-qz-secondary hover:border-qz-blue hover:text-qz-blue transition-colors min-h-[160px] font-medium"
          >
            <span className="text-3xl">+</span>
            <span>New Set</span>
          </Link>
          <SavedTranslationsCard count={savedCount} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify in browser**

1. Go to http://localhost:3000/home
2. Confirm "Saved Translations" card appears at the end of the grid
3. Confirm count matches actual saved count
4. Click card → navigates to `/saved` (page will 404 until Task 6 is done — that's fine)

- [ ] **Step 4: Commit**

```bash
git add components/SavedTranslationsCard.tsx app/home/page.tsx
git commit -m "feat: add SavedTranslationsCard to home page"
```

---

### Task 6: /saved page + SavedTranslationsList

**Goal:** Build the `/saved` page listing all saved translations with inline optimistic delete.

**Files:**
- Create: `app/saved/page.tsx`
- Create: `components/SavedTranslationsList.tsx`

**Acceptance Criteria:**
- [ ] `/saved` shows AppNav + breadcrumb "Home › Saved Translations" + h1
- [ ] Each row shows Italian (text-lg font-bold text-qz-text) and English (text-sm text-qz-secondary) with a ✕ button on the right
- [ ] Clicking ✕ removes the row immediately from the UI (optimistic) then calls DELETE API
- [ ] Empty state shows "No saved translations yet — use Quick Translate on the home screen to get started."
- [ ] Unauthenticated users are redirected to `/login`

**Verify:**
1. Go to http://localhost:3000/saved — list renders correctly
2. Click ✕ on an entry — it disappears instantly
3. Refresh — deleted entry is gone (confirmed removed from DB)
4. Delete all entries — empty state message appears

**Steps:**

- [ ] **Step 1: Create `components/SavedTranslationsList.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { SavedTranslation } from '@/lib/types'

interface Props {
  initialItems: SavedTranslation[]
}

export default function SavedTranslationsList({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems)

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
    await fetch(`/api/saved-translations/${id}`, { method: 'DELETE' })
  }

  if (items.length === 0) {
    return (
      <p className="text-qz-secondary text-sm">
        No saved translations yet — use Quick Translate on the home screen to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <div
          key={item.id}
          className="bg-white rounded-2xl border-2 border-qz-border px-5 py-4 flex items-center justify-between"
          style={{ boxShadow: 'var(--qz-shadow-card)' }}
        >
          <div>
            <p className="text-lg font-bold text-qz-text">{item.italian}</p>
            <p className="text-sm text-qz-secondary">{item.english}</p>
          </div>
          <button
            onClick={() => void handleDelete(item.id)}
            className="ml-4 text-qz-muted hover:text-red-500 transition-colors text-xl leading-none cursor-pointer shrink-0"
            aria-label="Remove saved translation"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/saved/page.tsx`**

```tsx
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isValidUserId, getUserById } from '@/lib/users'
import AppNav from '@/components/AppNav'
import SavedTranslationsList from '@/components/SavedTranslationsList'
import type { SavedTranslation } from '@/lib/types'

async function getSavedTranslations(userId: number): Promise<SavedTranslation[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/saved-translations`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<SavedTranslation[]>
}

export default async function SavedPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const user = getUserById(userId)
  const items = await getSavedTranslations(userId)

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-qz-secondary mb-6">
          <Link href="/home" className="hover:text-qz-text transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-qz-text font-medium">Saved Translations</span>
        </nav>

        <h1 className="text-2xl font-bold text-qz-text mb-6">Saved Translations</h1>

        <SavedTranslationsList initialItems={items} />
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify in browser**

1. Go to http://localhost:3000/saved
2. Confirm AppNav, breadcrumb, h1, and list render correctly
3. Confirm each row: Italian bold on top, English smaller below, ✕ on right
4. Click ✕ — entry disappears immediately (no page reload)
5. Refresh — entry is gone
6. Delete everything — "No saved translations yet…" message appears

- [ ] **Step 4: Commit**

```bash
git add components/SavedTranslationsList.tsx app/saved/page.tsx
git commit -m "feat: add /saved page with SavedTranslationsList"
```
