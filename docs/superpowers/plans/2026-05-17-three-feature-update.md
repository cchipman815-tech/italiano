# Three-Feature Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix sentence practice translation answers showing in the wrong language, add a rich translation widget to the dashboard, and add a conjugation flashcard study mode.

**Architecture:** Four sequential tasks — each independent and committable. Task 1 fixes a data shape bug. Task 2 extends the translate API. Task 3 builds and mounts a new client component on the dashboard. Task 4 builds the conjugation study mode end-to-end.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase Postgres, Google Cloud Translation API, Anthropic Claude Haiku

---

## File Structure

| File | Task | Action |
|---|---|---|
| `app/api/sentences/generate/route.ts` | 1 | Modify — update system prompt, type, cache check, row mapper |
| `components/SentencePractice.tsx` | 1 | Modify — `TranslationView` picks correct option set by direction |
| `app/api/translate/route.ts` | 2 | Modify — add `word` and `sentence` modes using Claude Haiku |
| `components/TranslatorWidget.tsx` | 3 | Create — translation input + rich result display |
| `app/home/page.tsx` | 3 | Modify — mount `TranslatorWidget` above set grid |
| `components/ConjugationStudy.tsx` | 4 | Create — conjugation flashcard drill component |
| `app/sets/[id]/conjugation/page.tsx` | 4 | Create — server page for conjugation mode |
| `app/sets/[id]/page.tsx` | 4 | Modify — compute `hasConjugations`, pass to `StudyModePicker` |
| `components/StudyModePicker.tsx` | 4 | Modify — add Conjugations entry when `hasConjugations` is true |

---

## Task 1: Fix Sentence Practice Translation Answers

**Goal:** Translation questions in Sentence Practice show Italian options when they should show English options (for IT→EN direction) and vice versa.

**Files:**
- Modify: `app/api/sentences/generate/route.ts`
- Modify: `components/SentencePractice.tsx`

**Acceptance Criteria:**
- [ ] IT→EN direction: Translation question shows an Italian prompt and English answer choices
- [ ] EN→IT direction: Translation question shows an English prompt and Italian answer choices
- [ ] Stale cached rows (old `options`/`correct` format) are deleted and regenerated on next visit
- [ ] TypeScript compiles with no errors

**Verify:** Open a set's Sentence Practice in IT→EN mode. On translation questions, the 3 choices should be English sentences. Switch to EN→IT — choices become Italian sentences.

**Steps:**

- [ ] **Step 1: Update `TranslationQuestion` type and system prompt in `app/api/sentences/generate/route.ts`**

Replace the `TranslationQuestion` type (lines 8–35 area) and the `SYSTEM_PROMPT` constant.

New `TranslationQuestion` type:
```typescript
export type TranslationQuestion = {
  id: string
  type: 'translation'
  italian: string
  english: string
  options_it: string[]
  correct_it: string
  options_en: string[]
  correct_en: string
  grammarNote: string
}
```

New `SYSTEM_PROMPT` (replace entire constant):
```typescript
const SYSTEM_PROMPT = `You are an Italian language teacher creating practice exercises for Prego! chapter 1–3 beginners.
Generate exactly 10 questions mixing three formats: fill_blank (4), dialogue (3), translation (3).
Use ONLY the vocabulary words provided. Keep sentences 5–10 words, present tense only. No subjunctive, conditional, or past tense.

Return ONLY valid JSON with this exact shape (no markdown, no extra text):
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
      "options_it": ["Lei è alto e intelligente.", "Lei è alta e intelligente.", "Lui è alta e intelligente."],
      "correct_it": "Lei è alta e intelligente.",
      "options_en": ["She is tall and intelligent.", "He is tall and intelligent.", "She is short and intelligent."],
      "correct_en": "She is tall and intelligent.",
      "grammar_note": "alta — feminine singular of alto"
    }
  ]
}

Rules:
- fill_blank: use ___ as placeholder; blank a verb form, noun, or adjective — never articles or prepositions; options array has exactly 4 items including the correct answer
- dialogue: 2 speakers, 2–3 lines each; question must be answerable from the dialogue; options array has exactly 3 items
- translation: include one subtle grammar trap in options_it (gender agreement, word order); options_it has exactly 3 Italian variants; options_en has exactly 3 English translations with subtle meaning differences; correct_it and correct_en are the correct answers
- All content must be Prego chapter 1–3 beginner level`
```

- [ ] **Step 2: Update the cache-hit check to detect stale rows**

Find the block starting `if (cached && cached.length >= 10)` and replace it:

```typescript
if (cached && cached.length >= 10) {
  // Detect stale cached rows that use the old options/correct format
  const translationRows = cached.filter(r => r.type === 'translation')
  const hasOldFormat = translationRows.some(r => {
    const m = r.metadata as Record<string, unknown>
    return m.options !== undefined && m.options_en === undefined
  })
  if (!hasOldFormat) {
    return NextResponse.json({ questions: rowsToQuestions(cached) })
  }
  // Fall through — stale data will be deleted below before regenerating
}
```

- [ ] **Step 3: Update the row-building block for translation questions**

Find the `else` branch in the `rows` mapping (the translation case) and replace it:

```typescript
} else {
  return {
    set_id:   setId,
    card_id:  cardMap[(q.italian as string)?.split(' ')[0]?.toLowerCase()] ?? null,
    type:     'translation' as const,
    italian:  q.italian as string,
    english:  q.english as string,
    metadata: {
      options_it:  q.options_it,
      correct_it:  q.correct_it,
      options_en:  q.options_en,
      correct_en:  q.correct_en,
      grammarNote: q.grammar_note,
    },
  }
}
```

- [ ] **Step 4: Update `rowsToQuestions` for the translation case**

Find the `else` branch in `rowsToQuestions` (the translation case) and replace it:

```typescript
} else {
  return {
    id:          row.id,
    type:        'translation',
    italian:     row.italian,
    english:     row.english,
    options_it:  m.options_it as string[],
    correct_it:  m.correct_it as string,
    options_en:  m.options_en as string[],
    correct_en:  m.correct_en as string,
    grammarNote: m.grammarNote as string,
  } satisfies TranslationQuestion
}
```

- [ ] **Step 5: Update `TranslationView` in `components/SentencePractice.tsx`**

Replace the entire `TranslationView` function:

```typescript
function TranslationView({ q, selected, onAnswer, onNext, direction }: {
  q: TranslationQuestion; selected: string | null; onAnswer: (o: string) => void; onNext: () => void
  direction: 'it-en' | 'en-it'
}) {
  const prompt  = direction === 'it-en' ? q.italian : q.english
  const hint    = direction === 'it-en' ? 'Choose the correct English translation ↓' : 'Choose the correct Italian translation ↓'
  const options = direction === 'it-en' ? q.options_en : q.options_it
  const correct = direction === 'it-en' ? q.correct_en : q.correct_it
  return (
    <>
      <FormatPill type="translation" />
      <p className="text-xl font-semibold text-qz-text mt-3 mb-1.5 w-full text-left">{prompt}</p>
      <p className="text-xs text-qz-muted mb-4 w-full text-left">{hint}</p>
      <div className="flex flex-col gap-2 w-full mb-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => !selected && onAnswer(opt)}
            disabled={!!selected}
            className={optionClass(opt, selected, correct)}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected && (
        <FeedbackBar correct={selected === correct} grammarNote={q.grammarNote} onNext={onNext} />
      )}
    </>
  )
}
```

- [ ] **Step 6: Update `isCorrectAnswer` in the `SentencePractice` component body**

The `isCorrectAnswer` function inside `SentencePractice` uses `q.correct` for translation questions. Update it:

```typescript
function isCorrectAnswer(option: string): boolean {
  if (q.type === 'fill_blank')  return option === q.blankWord
  if (q.type === 'dialogue')    return option === q.correct
  if (q.type === 'translation') {
    const correct = direction === 'it-en' ? q.correct_en : q.correct_it
    return option === correct
  }
  return false
}
```

- [ ] **Step 7: Type-check and commit**

```bash
cd /Users/chance/Claude/Claude\ Code/italiano/distracted-mestorf-8d7f79
npx tsc --noEmit
```

Expected: no errors.

```bash
git add app/api/sentences/generate/route.ts components/SentencePractice.tsx
git commit -m "fix: sentence practice translation questions now show correct-language options"
```

---

## Task 2: Add Word and Sentence Enrichment Modes to Translate API

**Goal:** `/api/translate` can now handle `mode: 'word'` (returns article, gender, plural, grammarNote via Claude) and `mode: 'sentence'` (returns Italian translation + literalNote via Claude).

**Files:**
- Modify: `app/api/translate/route.ts`

**Acceptance Criteria:**
- [ ] `POST /api/translate` with `{ english: "backpack", mode: "word" }` returns `{ italian, article, gender, plural, grammarNote }`
- [ ] `POST /api/translate` with `{ english: "She speaks quickly", mode: "sentence" }` returns `{ italian, literalNote }`
- [ ] Existing `translate` and `conjugations` modes continue to work
- [ ] TypeScript compiles with no errors

**Verify:**
```bash
# From the project root, with dev server running on port 3000:
curl -s -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -H "Cookie: userId=1" \
  -d '{"english":"backpack","mode":"word"}' | jq .
# Expected: { "italian": "zaino", "article": "lo", "gender": "m", "plural": "gli zaini", "grammarNote": "..." }

curl -s -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -H "Cookie: userId=1" \
  -d '{"english":"She speaks quickly","mode":"sentence"}' | jq .
# Expected: { "italian": "Lei parla velocemente.", "literalNote": "..." }
```

**Steps:**

- [ ] **Step 1: Add Anthropic import and client to `app/api/translate/route.ts`**

Add at the top of the file, after the existing imports:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

- [ ] **Step 2: Add `word` mode handler**

In the `POST` function, add this block immediately before the existing `if (mode === 'conjugations')` block:

```typescript
if (mode === 'word') {
  const italian = await translateText(english.trim())
  let message
  try {
    message = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Given the Italian word "${italian}" (English: "${english.trim()}"), return ONLY valid JSON:\n{"article":"lo","gender":"m","plural":"gli zaini","grammarNote":"Uses lo/gli because it starts with z-"}\nRules: article is the definite singular form; gender is "m" or "f"; plural includes the definite article; grammarNote is one short sentence or empty string.`,
      }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    const meta = JSON.parse(cleaned)
    return NextResponse.json({ italian, ...meta })
  } catch {
    return NextResponse.json({ error: 'Claude returned invalid JSON', raw }, { status: 500 })
  }
}
```

- [ ] **Step 3: Add `sentence` mode handler**

Add this block immediately after the `word` mode block (still before `conjugations`):

```typescript
if (mode === 'sentence') {
  const italian = await translateText(english.trim())
  let message
  try {
    message = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `English: "${english.trim()}"\nItalian: "${italian}"\nReturn ONLY valid JSON with one field:\n{"literalNote":"Short explanation of what structurally changed, e.g. velocemente = a single adverb where English uses speak quickly"}\nKeep literalNote under 120 characters.`,
      }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    const meta = JSON.parse(cleaned)
    return NextResponse.json({ italian, ...meta })
  } catch {
    return NextResponse.json({ error: 'Claude returned invalid JSON', raw }, { status: 500 })
  }
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
git add app/api/translate/route.ts
git commit -m "feat: add word and sentence enrichment modes to translate API"
```

---

## Task 3: Build and Mount TranslatorWidget on Dashboard

**Goal:** A "Quick Translate" panel sits above the set grid on the home page. Words return article/gender/plural/note; sentences return Italian + literal structure note.

**Files:**
- Create: `components/TranslatorWidget.tsx`
- Modify: `app/home/page.tsx`

**Acceptance Criteria:**
- [ ] Widget is visible above the set grid on the home dashboard
- [ ] Typing a single word (no space) and clicking Translate returns Italian with article, gender, plural, grammar note badges
- [ ] Typing a phrase (with space) and clicking Translate returns Italian with a "Literally in Italian structure" inset box
- [ ] 🔊 button plays the Italian pronunciation
- [ ] Typing in the input clears a previous result
- [ ] Enter key submits
- [ ] TypeScript compiles with no errors

**Verify:** Run dev server (`npm run dev`), sign in, observe widget above set cards. Test with "backpack" (word) and "She speaks quickly" (sentence).

**Steps:**

- [ ] **Step 1: Create `components/TranslatorWidget.tsx`**

```typescript
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

type TranslateResult = WordResult | SentenceResult

export default function TranslatorWidget() {
  const [input,   setInput]   = useState('')
  const [result,  setResult]  = useState<TranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleTranslate() {
    const trimmed = input.trim()
    if (!trimmed) return
    const mode = trimmed.includes(' ') ? 'sentence' : 'word'
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: trimmed, mode }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult({ type: mode, ...data } as TranslateResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'flex-1 border-2 border-qz-border rounded-xl px-3 py-2.5 text-qz-text text-sm placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white'

  return (
    <div className="bg-white rounded-2xl border-2 border-qz-border p-5 mb-6" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
      <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-3">🌐 Quick Translate</p>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setResult(null); setError('') }}
          onKeyDown={e => e.key === 'Enter' && !loading && handleTranslate()}
          placeholder="Type an English word or phrase…"
          className={inputCls}
        />
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
        <div className="mt-4 bg-qz-subtle border border-qz-border rounded-xl p-4">
          {result.type === 'word' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-qz-text">{result.italian}</span>
                <SpeakButton text={result.italian} />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-qz-blue-light text-qz-blue text-xs font-semibold px-2.5 py-1 rounded-full">
                  {result.article}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  result.gender === 'm' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                }`}>
                  {result.gender === 'm' ? 'masculine' : 'feminine'}
                </span>
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
                <div className="bg-white border border-qz-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-1">
                    Literally in Italian structure
                  </p>
                  <p className="text-sm text-qz-text italic">{result.literalNote}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Mount `TranslatorWidget` in `app/home/page.tsx`**

Add the import at the top of the file (after the existing imports):

```typescript
import TranslatorWidget from '@/components/TranslatorWidget'
```

Then in the returned JSX, add `<TranslatorWidget />` between the `</header>` closing tag and the `<div className="grid ...">` opening tag:

```tsx
      </header>

      <TranslatorWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
git add components/TranslatorWidget.tsx app/home/page.tsx
git commit -m "feat: add Quick Translate widget to dashboard"
```

---

## Task 4: Build Conjugation Flashcard Mode

**Goal:** Sets with verb conjugation data get a new "Conjugations" study mode in the StudyModePicker that drills all 6 pronoun forms per verb as individual flashcards.

**Files:**
- Create: `components/ConjugationStudy.tsx`
- Create: `app/sets/[id]/conjugation/page.tsx`
- Modify: `app/sets/[id]/page.tsx`
- Modify: `components/StudyModePicker.tsx`

**Acceptance Criteria:**
- [ ] On a set with verb conjugation data, the StudyModePicker shows a "Conjugations" entry between Flashcards and Sentence Practice
- [ ] On a set without conjugation data, "Conjugations" entry is hidden
- [ ] Conjugation mode shows one card per pronoun form (6 cards × number of verbs), shuffled
- [ ] IT→EN: front shows "(io) ho" + verb label, back shows "I have"
- [ ] EN→IT: front shows "I have" + verb label, back shows "(io) ho" + speaker
- [ ] Space flips, ← marks unknown, → marks known
- [ ] Session complete screen shows score with Study Again / Back to Set buttons
- [ ] TypeScript compiles with no errors

**Verify:** Open a chapter set (e.g. Ch 1 with `avere`). StudyModePicker shows "Conjugations". Click it. Cards show "(io) ho", "(tu) hai", etc. with the "avere · verb" pill at top.

**Steps:**

- [ ] **Step 1: Create `components/ConjugationStudy.tsx`**

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'
import SpeakButton from '@/components/SpeakButton'

interface ConjugationItem {
  verbItalian: string
  verbEnglish: string
  pronoun: string
  italianForm: string
  englishMeaning: string
}

const PRONOUN_TEMPLATES: Array<{ pronoun: string; enTemplate: (base: string) => string }> = [
  { pronoun: 'io',      enTemplate: base => `I ${base}` },
  { pronoun: 'tu',      enTemplate: base => `you ${base}` },
  { pronoun: 'lui/lei', enTemplate: base => `he/she ${base}` },
  { pronoun: 'noi',     enTemplate: base => `we ${base}` },
  { pronoun: 'voi',     enTemplate: base => `you all ${base}` },
  { pronoun: 'loro',    enTemplate: base => `they ${base}` },
]

function verbBase(english: string): string {
  return english.trim().toLowerCase().replace(/^to\s+/, '')
}

function buildDeck(cards: Card[]): ConjugationItem[] {
  const items: ConjugationItem[] = []
  for (const card of cards) {
    const present = card.conjugations?.present
    if (!present) continue
    const base = verbBase(card.english)
    const verbEnglish = card.english.trim().toLowerCase().startsWith('to ')
      ? card.english
      : `to ${card.english}`
    for (const { pronoun, enTemplate } of PRONOUN_TEMPLATES) {
      const italianForm = present[pronoun as keyof typeof present]
      if (!italianForm) continue
      items.push({
        verbItalian:    card.italian,
        verbEnglish,
        pronoun,
        italianForm,
        englishMeaning: enTemplate(base),
      })
    }
  }
  return shuffleArray(items)
}

interface Props {
  setId: string
  cards: Card[]
  direction?: 'it-en' | 'en-it'
}

export default function ConjugationStudy({ setId, cards, direction = 'it-en' }: Props) {
  const router = useRouter()
  const [deck]    = useState(() => buildDeck(cards))
  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [score,   setScore]   = useState(0)
  const [done,    setDone]    = useState(false)

  const current = deck[index]

  const advance = useCallback((known: boolean) => {
    if (known) setScore(s => s + 1)
    setFlipped(false)
    if (index + 1 >= deck.length) setDone(true)
    else setIndex(i => i + 1)
  }, [index, deck.length])

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <div className="flex gap-8 text-lg">
          <div className="text-qz-blue font-semibold">✓ {score} known</div>
          <div className="text-red-600 font-semibold">✗ {deck.length - score} unknown</div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setScore(0); setDone(false) }}
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

  const frontWord    = direction === 'it-en'
    ? `(${current.pronoun}) ${current.italianForm}`
    : current.englishMeaning
  const backWord     = direction === 'it-en'
    ? current.englishMeaning
    : `(${current.pronoun}) ${current.italianForm}`
  const verbPillFront = `${current.verbItalian} · verb`
  const verbPillBack  = `${current.verbItalian} — ${current.verbEnglish}`

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-sm text-qz-secondary mb-3">
          <span>{index + 1} / {deck.length}</span>
          <span className="text-qz-blue font-medium">{score} known</span>
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
        className="w-full max-w-2xl bg-white border-2 border-qz-border rounded-2xl select-none min-h-[280px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-3">
          {!flipped ? (
            <>
              <span className="text-xs font-bold uppercase tracking-wide bg-qz-blue-light text-qz-blue px-3 py-1 rounded-full">
                {verbPillFront}
              </span>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl font-bold text-qz-text">{frontWord}</span>
                {direction === 'it-en' && <SpeakButton text={current.italianForm} />}
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-bold uppercase tracking-wide bg-qz-blue-light text-qz-blue px-3 py-1 rounded-full">
                {verbPillBack}
              </span>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-sm text-qz-secondary">{frontWord}</span>
                {direction === 'it-en' && <SpeakButton text={current.italianForm} size="sm" />}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl font-bold text-qz-text">{backWord}</span>
                {direction === 'en-it' && <SpeakButton text={current.italianForm} />}
              </div>
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
        <p className="text-xs text-qz-secondary">press space to flip · ← → arrow keys to answer after flipping</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/sets/[id]/conjugation/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ConjugationStudy from '@/components/ConjugationStudy'
import { isValidUserId } from '@/lib/users'
import type { SetWithCards } from '@/lib/types'

export default async function ConjugationPage({
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
  const verbCards = data.cards.filter(c => c.conjugations?.present != null)

  if (verbCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">No conjugation data in this set.</p>
        <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">
          Enable more cards
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {data.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Conjugations</span>
      </div>
      <ConjugationStudy setId={id} cards={data.cards} direction={direction} />
    </div>
  )
}
```

- [ ] **Step 3: Update `app/sets/[id]/page.tsx` to compute `hasConjugations`**

Find the block that computes `canStudyMulti` and `dueCount`, and add one line after `canStudyMulti`:

```typescript
  const canStudyMulti = totalCards >= 4
  const hasConjugations = set.cards.some(c => c.conjugations?.present != null)
```

Then update the `<StudyModePicker>` JSX to pass the new prop:

```tsx
      <StudyModePicker setId={id} canStudyMulti={canStudyMulti} dueCount={dueCount} hasConjugations={hasConjugations} />
```

- [ ] **Step 4: Update `components/StudyModePicker.tsx` to accept `hasConjugations` and render the new entry**

Update the `Props` interface:

```typescript
interface Props {
  setId: string
  canStudyMulti: boolean
  dueCount: number
  hasConjugations: boolean
}
```

Update the function signature:

```typescript
export default function StudyModePicker({ setId, canStudyMulti, dueCount, hasConjugations }: Props) {
```

Then add the Conjugations entry as the second item in the mode list, immediately after the closing `</Link>` of the Flashcards entry and before the Sentence Practice entry:

```tsx
      {hasConjugations && (
        <Link
          href={`/sets/${setId}/conjugation?direction=${direction}`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🔤</span>
          <div>
            <div className="font-semibold text-qz-text">Conjugations</div>
            <div className="text-sm text-qz-secondary">Drill every verb form as a flashcard</div>
          </div>
        </Link>
      )}
```

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
git add components/ConjugationStudy.tsx app/sets/[id]/conjugation/page.tsx app/sets/[id]/page.tsx components/StudyModePicker.tsx
git commit -m "feat: add Conjugations flashcard study mode"
```

---

## Final Deploy

After all four tasks are committed:

```bash
npx vercel --prod
```

Verify on https://italiano-prego.vercel.app:
1. Sentence Practice IT→EN — translation question choices are in English ✓
2. Home dashboard — Quick Translate widget above the set cards ✓
3. A chapter set — "Conjugations" appears in StudyModePicker ✓
4. Conjugations mode — cards show "(io) ho" / "avere · verb", flip reveals "I have" ✓
