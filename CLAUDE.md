# Italiano — Claude Reference

Italian language flashcard/study app for Chance and Jennifer. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and Supabase Postgres. Deployed at https://italiano-prego.vercel.app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 (`@theme inline`) |
| Language | TypeScript 5 |
| Database | Supabase Postgres |
| Auth | Cookie-based (`userId` cookie, no real accounts) |
| Font | Inter via `next/font/google` |
| Translation | Google Cloud Translation API v2 |
| Text-to-Speech | Google Cloud Text-to-Speech API (Neural2-A, `it-IT`) |
| Deployment | Vercel |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   Supabase anon key
SUPABASE_SERVICE_ROLE_KEY       Supabase service role key (server-only)
NEXT_PUBLIC_APP_URL             App base URL (http://localhost:3000 locally)
GOOGLE_TRANSLATE_API_KEY        Single key used for both Translation and TTS APIs
ANTHROPIC_API_KEY               Claude API key (used by translate word/sentence modes and sentence generation)
```

---

## Database Schema (Supabase Postgres)

### `sets`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | |
| description | text | nullable |
| category | text | general/verbs/nouns/phrases/numbers/adjectives/alphabet/time |
| sort_order | integer | |
| created_at | timestamptz | |

### `cards`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| set_id | uuid | FK → sets |
| italian | text | |
| english | text | |
| sort_order | integer | |
| conjugations | jsonb | nullable; shape: `{ present?: ConjugationForms }` |
| enabled | boolean | default true |

**ConjugationForms:** `{ io, tu, "lui/lei", noi, voi, loro }` — all strings

### `progress`
| Column | Type | Notes |
|---|---|---|
| user_id | integer | 1=Chance, 2=Jennifer |
| card_id | uuid | FK → cards |
| known | boolean | |
| last_seen_at | timestamptz | |
| (unique: user_id + card_id) | | |

---

## File Map

### Pages (`app/`)
| File | Description |
|---|---|
| `app/page.tsx` | Root → redirects to `/home` |
| `app/layout.tsx` | Root layout: Inter font, `qz-bg` body |
| `app/globals.css` | Tailwind v4 + Quizlet design tokens |
| `app/login/page.tsx` | Pick Chance or Jennifer (sets `userId` cookie) |
| `app/home/page.tsx` | Dashboard: all sets with progress bars |
| `app/sets/new/page.tsx` | Create set form |
| `app/sets/[id]/page.tsx` | Set detail: study mode picker + progress |
| `app/sets/[id]/edit/page.tsx` | Edit set: verb groups, auto-translate, card CRUD |
| `app/sets/[id]/flashcard/page.tsx` | Server wrapper → FlashcardStudy |
| `app/sets/[id]/quiz/page.tsx` | Server wrapper → QuizStudy |
| `app/sets/[id]/match/page.tsx` | Server wrapper → MatchStudy |

### API Routes (`app/api/`)
| Route | Methods | Description |
|---|---|---|
| `/api/sets` | GET, POST | List sets with progress; create set |
| `/api/sets/[id]` | GET, PUT, DELETE | Set + cards + progress; update; delete |
| `/api/sets/[id]/cards` | POST | Add card to set |
| `/api/cards/[id]` | PUT, DELETE | Update card fields; delete card |
| `/api/progress` | POST | Upsert `{ cardId, known }` for current user |
| `/api/translate` | POST | `{ english, mode: 'translate'|'conjugations' }` → Italian or 6 conjugation pairs |
| `/api/tts` | POST | `{ text }` → base64 MP3 via Google Neural2-A at 0.9x speed |

### Components (`components/`)
| File | Description |
|---|---|
| `FlashcardStudy.tsx` | Flip cards (click/space), arrow keys to mark known/unknown, conjugation table on back, SpeakButton on front+back |
| `QuizStudy.tsx` | 4-option multiple choice, auto-advance 1.2s after answer, score tracking |
| `MatchStudy.tsx` | 4-column tile grid, round-based (4 cards), shake on mismatch |
| `CardEditor.tsx` | Card row in edit view: enable toggle, inline edit, conjugation grid editor, SpeakButton, delete |
| `SetCard.tsx` | Set summary card: title, category badge, progress bar, Study/Edit pill buttons |
| `SpeakButton.tsx` | TTS button calling `/api/tts`; states: 🔊 idle → … loading → ♪ playing. Props: `text`, `size` |
| `SignOutButton.tsx` | Clears cookie → `/login` |

### Library (`lib/`)
| File | Description |
|---|---|
| `types.ts` | Interfaces: `User`, `Set`, `Card`, `Progress`, `Conjugations`, `ConjugationForms`, `SetWithProgress`, `SetWithCards` |
| `supabase.ts` | `createServerClient()` with service role key |
| `users.ts` | `VALID_USER_IDS = [1, 2]`, `isValidUserId()` |
| `utils.ts` | `shuffleArray<T>()`, `calculateProgress()` |
| `quiz.ts` | `selectDistractors()` for multiple-choice distractors |
| `api-helpers.ts` | `getUserIdFromCookie()`, `unauthorized()`, `notFound()` |

### `proxy.ts`
Middleware: unauthenticated → `/login`; authenticated on `/login` → `/home`; API routes pass through.

### Scripts (`scripts/`)
| File | Description |
|---|---|
| `seed.ts` | Seeds all vocabulary sets and cards |
| `seed-conjugations.ts` | Adds `conjugations` JSONB to 50 verb cards |
| `migrate-conjugation-cards.ts` | Creates 300 individual conjugation cards (all disabled by default) |
| `verify-translations.ts` | Batch-verifies all 575 cards via Google Translate IT→EN |

---

## Design System (Quizlet tokens)

All defined in `app/globals.css` via CSS vars + `@theme inline`:

| Token | Value | Usage |
|---|---|---|
| `qz-blue` | `#4255ff` | Primary actions, selected state |
| `qz-blue-dark` | `#3345ef` | Hover state |
| `qz-blue-light` | `#edefff` | Matched tiles, badges, subtle highlights |
| `qz-bg` | `#f6f7fb` | Page background |
| `qz-text` | `#282e3e` | Primary text |
| `qz-secondary` | `#586380` | Labels, subtitles |
| `qz-muted` | `#8b90a0` | Placeholder, disabled text |
| `qz-border` | `#d9dde8` | All borders |
| `qz-subtle` | `#edeef4` | Group headers, inset sections |

**Conventions:**
- Cards: `rounded-2xl border-2 border-qz-border bg-white` + `style={{ boxShadow: 'var(--qz-shadow-card)' }}`
- Primary buttons: `bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark`
- Secondary buttons: `border-2 border-qz-border rounded-full text-qz-secondary hover:border-qz-blue`
- Page max-width: `max-w-2xl mx-auto px-4`

---

## Key Patterns

- **Server components** fetch all data, pass as props to client study components
- **Client components** call API routes directly for mutations
- **Progress** is fire-and-forget (`saveProgress()` not awaited)
- **Enabled filtering** happens client-side: `cards.filter(c => c.enabled !== false)`
- **Verb grouping** computed client-side: match conjugation card `.italian` against parent verb's `conjugations.present` values
- **Both Google APIs** share `GOOGLE_TRANSLATE_API_KEY`
- **Deploy**: `npx vercel --prod` from project root
