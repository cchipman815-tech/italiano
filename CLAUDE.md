# Italiano — Claude Reference

Italian study app for Chance and Jennifer, used on their phones about 95% of the time. The design is "Notte": warm dark ground, Ambra as the only accent, bilingual labels. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 and Supabase Postgres. Live at https://italiano-prego.vercel.app.

`AGENTS.md` applies too: this Next.js has breaking changes, so read `node_modules/next/dist/docs/` before using an API you're unsure of (for example, middleware is `proxy.ts`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 (`@theme inline`), plain CSS per area in `app/*.css` |
| Language | TypeScript 5 |
| Database | Supabase Postgres (service-role client, server only) |
| Auth | Cookie-based (`userId` cookie; 1 = Chance, 2 = Jennifer; no passwords) |
| Fonts | `next/font/google`: **Fraunces** (Italian words, headings; variable with italic), **Geist** (interface), **Geist Mono** (small labels, numbers) |
| Translation | Google Cloud Translation API v2, plus Claude (Haiku) for word/sentence modes |
| Text-to-Speech | Google Cloud Text-to-Speech (Neural2-A, `it-IT`, 0.9×) |
| Testing | Vitest + Testing Library (jsdom) |
| Deployment | Vercel, deployed from git (push to `main`) |

No new runtime dependencies without a clear need. Animations are CSS transitions plus the View Transitions API; icons are inline SVG in `components/StudyIcons.tsx`.

---

## Deploying

- **Push to `main` → Vercel builds it and takes the production alias automatically.** So commit → push → live.
- Use the **`italiano-deploy` skill** (`.claude/skills/italiano-deploy/`) when changes are ready: it runs `status.sh` and `preflight.sh`, reports what could break, then gives the phrase to use ("ship it", "commit it, don't ship yet", "put it on a branch", "roll it back").
- GitHub Actions (`.github/workflows/ci.yml`) runs typecheck and tests on pushes and PRs to `main`; it doesn't gate the deploy.
- Feature work happens in a worktree (`git worktree add .worktrees/<name> -b feature/<name>`; `.worktrees/` is gitignored). Merge `origin/main` in, then `git push origin HEAD:main`.
- `npx vercel --prod` is the emergency path only, from a clean checkout. Vercel project `italiano` (orgId `team_BmodZ6p7di0GBZJKbreJaAiH`, projectId `prj_cogBzeiqoJS3Ln4wDwD5oz0hA4kY`), linked in `.vercel/project.json`.
- After shipping, check the live site.

---

## Supabase

- Env vars in `.env.local` (never commit it). `lib/supabase.ts` exports `createServerClient()` with the service role key; never expose that key to the client.
- Migrations live in `supabase/migrations/`, numbered. They are applied by hand (or by Claude through the Supabase connector, with Chance's permission for each live write). New data scripts default to a dry run and need `--confirm` to write.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   Supabase anon key (not used by the app today)
SUPABASE_SERVICE_ROLE_KEY       Service role key (server only, never expose to the client)
NEXT_PUBLIC_APP_URL             App base URL (http://localhost:3000 locally)
GOOGLE_TRANSLATE_API_KEY        One key for both Translation and TTS
ANTHROPIC_API_KEY               Claude API key (translate word/sentence modes, plural/example generation, sentence practice)
```

Scripts in `scripts/` load `.env.local` with `dotenv`.

---

## Database Schema (Supabase Postgres)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | integer | PK; 1 = Chance, 2 = Jennifer |
| name | text | |

### `sets` (a **topic**)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | Matches a topic in `lib/paths.ts` |
| description | text | nullable |
| category | text | The **path**: `nouns` (Parole) / `verbs` (Verbi) / `adjectives` (Descrivere) / `phrases` (Frasi) |
| sort_order | integer | Order within the path |
| created_at | timestamptz | |

There's no `sets.chapter`; a topic's chapter comes from its cards.

### `cards`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| set_id | uuid | FK → sets (CASCADE DELETE) |
| italian | text | Without the article for nouns |
| english | text | |
| sort_order | integer | |
| enabled | boolean | default true; off = left out of study |
| conjugations | jsonb | nullable; `{ present?: ConjugationForms, past?, future?, off?: Pronoun[] }`. `off` lists present-tense forms switched off in Modifica argomento (absent = all on) |
| gender | text | nullable; `'m'` / `'f'` (CHECK) |
| plural | text | nullable, e.g. `"i libri"` |
| example | jsonb | nullable; `{ italian, english }` |
| chapter | integer | nullable; Prego chapter (007) |
| article | text | nullable; `il` / `la` / `l'` … (007) |
| word_type | text | nullable; `noun` / `verb` / `adjective` / `phrase` / `expression` (007) |
| adjective_forms | jsonb | nullable; `{ ms, fs, mp, fp }` (007) |
| tense | text | default `'present'` (007) |

**ConjugationForms:** `{ io, tu, "lui/lei", noi, voi, loro }`, all strings.

### `progress` (one row per user × card)
| Column | Type | Notes |
|---|---|---|
| user_id | integer | FK → users |
| card_id | uuid | FK → cards (CASCADE DELETE) |
| known | boolean | |
| last_seen_at | timestamptz | |
| interval | integer | SRS days (default 1) |
| ease_factor | float | SRS multiplier (default 2.5) |
| repetitions | integer | SRS streak (default 0) |
| next_review_at | date | null = never reviewed (a **new** card, not a due one) |
| (unique: user_id + card_id) | | |

### `conjugation_progress` (migration 010)
SRS for one form of a verb card (verb × tense × pronoun). Forms have no card of their own. Same SRS columns as `progress`, plus `tense` (default `'present'`) and `pronoun` (`io` … `loro`, CHECK). Unique on `(user_id, card_id, tense, pronoun)`. Due forms count toward Oggi's due number and appear in Ripasso.

### `saved_translations` (008, per-user since 009)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | integer | FK → users, NOT NULL (009; existing rows were copied to both users) |
| english, italian | text | |
| created_at | timestamptz | |
| (unique: user_id + english + italian) | | |

### `sentences` (007)
Generated practice sentences: `card_id`, `set_id`, `italian`, `english`, `type` (`example` / `fill_blank` / `dialogue` / `translation`), `chapter`, `metadata`.

---

## Content organization

4 **paths** (stored as `sets.category`) → 19 **topics** (rows in `sets`), defined in `lib/paths.ts`: Parole (nouns), Verbi (verbs), Descrivere (adjectives), Frasi (phrases). The Prego chapter (`cards.chapter`) is a quiet filter on Impara and in `/review?cap=`. Each path lists the study modes it offers; a mode is gated by how many cards are on (`modeAvailability`).

---

## File Map

### Pages (`app/`)
| File | Description |
|---|---|
| `layout.tsx` | Fonts, viewport (theme color per mode), stamps `data-mode` / `data-imm` / `data-layout` on `<html>` from cookies, wraps everything in `Shell` |
| `page.tsx` | → `/home` |
| `home/page.tsx` | **Oggi**: greeting, due/new readout, Continua card, 4 path tiles, "Ripassa tutto" |
| `learn/page.tsx` | **Impara**: chapter chips + 4 path cards (`ImparaView`) |
| `learn/[path]/page.tsx` | Path page: topic rows (`PathTopics`), topic sheet (`?topic=<id>` opens it), "+ Nuovo argomento", "Ripassa tutte le…" |
| `review/page.tsx` | **Ripasso**: everything due today, optionally `?set=`, `?path=` or `?cap=` |
| `translate/page.tsx` | **Traduci** (`TranslateView`) |
| `saved/page.tsx` | **Salvate**: the user's saved translations (`SavedView`) |
| `login/page.tsx` | **Chi studia?** (`WhoIsStudying`) |
| `sets/[id]/page.tsx` | Redirect: a topic opens as its path page's topic sheet |
| `sets/[id]/edit/page.tsx` | **Modifica argomento** (`EditTopic`) |
| `sets/[id]/{flashcard,quiz,listening,match,conjugation,sentence-practice}/page.tsx` | Study modes; server-built decks via `lib/study-page.ts` |
| `sets/[id]/review/page.tsx` | Redirect → `/review?set=<id>` |
| `loading.tsx`, `home/loading.tsx`, `learn/loading.tsx`, `learn/[path]/loading.tsx`, `sets/[id]/loading.tsx` | Skeleton screens (`components/Skeleton.tsx`) |
| `error.tsx` | Load error with Riprova |
| `not-found.tsx` | "Questa pagina non esiste" with Torna a Oggi |
| `manifest.ts`, `icon.svg`, `favicon.ico`, `apple-icon.png` | PWA manifest and icons; the icon files (and `public/icon-*.png`) are generated by `scripts/build-icons.ts` |

### Styles (`app/`)
| File | Covers |
|---|---|
| `globals.css` | Tokens (Notte/Giorno), motion tokens, reduced motion, base, glow + grain, `Bi` immersion rules, utilities; imports the rest |
| `shell.css` | Top bar, large title, tab bar, undo bar, sheets, profile sheet, view transitions |
| `screens.css` | Oggi, Impara, path pages, topic sheet, Traduci, Salvate |
| `study.css` | Study modes and session complete |
| `edit.css` | Modifica argomento, form sheets, Chi studia?, loading/error/not-found |
| `desktop.css` | Versione desktop (only with `data-layout="desktop"`) |

### API Routes (`app/api/`)
| Route | Methods | Description |
|---|---|---|
| `/api/sets` | POST | Nuovo argomento `{ title, category }` → a topic at the end of its path |
| `/api/sets/[id]` | DELETE | Deletes a topic and its cards; answers with a snapshot for Annulla |
| `/api/sets/[id]/cards` | POST | Add a card (validated by `parseNewCard`) |
| `/api/sets/restore` | POST | Replays a topic snapshot (undo) |
| `/api/cards/[id]` | PUT, DELETE | Update card fields; delete answers with a snapshot |
| `/api/cards/restore` | POST | Replays a card snapshot, progress included (undo) |
| `/api/progress` | POST | Upsert `{ cardId, known, interval, easeFactor, repetitions, nextReviewAt }` |
| `/api/conjugation-progress` | POST | `{ cardId, pronoun, known }` → SRS step for one form |
| `/api/saved-translations` | POST | Save a translation for the user (also used by undo) |
| `/api/saved-translations/[id]` | DELETE | Delete one of the user's rows |
| `/api/saved-translations/[id]/card` | POST | `{ setId }` → a card from a saved translation |
| `/api/translate` | POST | EN→IT / IT→EN, or `mode: 'conjugations'` for 6 present forms |
| `/api/plural` | POST | Generates and saves `cards.plural` |
| `/api/example` | POST | Generates and saves `cards.example` |
| `/api/sentences/generate` | POST | Questions for Frasi (sentence practice) |
| `/api/tts` | POST | `{ text }` → base64 MP3 |

### Components (`components/`)
| File | Description |
|---|---|
| `Shell.tsx` | Client shell: prefs, view-transition navigation, undo bar, profile sheet, install prompt; `useShell()` |
| `TabBar.tsx` | Glass tab bar (4 tabs, sliding pill via `--i`); a left rail in Versione desktop ≥1024px |
| `LargeTitle.tsx` | Large title that collapses into the glass top bar; avatar opens the profile |
| `SubpageBar.tsx` | Top bar with a labeled back button |
| `NavLink.tsx` | `Link` that plays the push/back/tab transition |
| `Sheet.tsx` | Bottom sheet: detents, drag to dismiss, Escape, focus handling, `inert` background |
| `ProfileSheet.tsx` | Giorno/Notte, Italian level, Versione desktop, install, Cambia, Esci |
| `UndoBar.tsx` | Bottom glass bar with Annulla; `role="status"` |
| `Bi.tsx` | Bilingual label (`k` from `lib/i18n.ts`, or `it`/`en`); CSS picks per immersion |
| `ImparaView.tsx`, `PathTopics.tsx`, `TopicSheet.tsx`, `Ring.tsx` | Impara, path topic rows, the topic sheet (modes, direction, Ripassa, Modifica), progress ring |
| `NewTopicSheet.tsx` | "+ Nuovo argomento" and its sheet |
| `TranslateView.tsx` | Traduci: result card, auto-save with Annulla, error card with Riprova |
| `SavedView.tsx`, `SavedActionsSheet.tsx` | Salvate: search, day groups, swipe delete + undo; row actions (Ascolta, Aggiungi a un argomento, Elimina) |
| `SwipeDeck.tsx` | Swipe deck (35% threshold, stamps, arc fling, buttons, keys: space/↑ flip, → lo so, ← ancora, ↓ salta) |
| `StudyFaces.tsx` | Card faces for words and conjugation forms |
| `FlashcardStudy.tsx`, `ReviewStudy.tsx`, `QuizStudy.tsx`, `ListeningStudy.tsx`, `MatchStudy.tsx`, `ConjugationStudy.tsx`, `SentencePractice.tsx` | The study modes |
| `ChoiceList.tsx` | Answer buttons for Quiz, Ascolto, Frasi (icon + label + color) |
| `StudyTop.tsx`, `StudyGate.tsx`, `SessionComplete.tsx` | Study top bar; a mode that can't start yet; the shared finished screen |
| `EditTopic.tsx`, `CardEditor.tsx`, `AddCardSheet.tsx` | Modifica argomento: switches, details in place, generate plural/example, two-step delete + undo, verb forms on/off, Aggiungi carta |
| `WhoIsStudying.tsx` | Chi studia? avatar buttons with due counts |
| `Speak.tsx` | `SpeakOrb` + `speak()`: TTS; `html.playing` while audio plays |
| `GenderBadge.tsx` | Neutral chip `la · f` |
| `StudyIcons.tsx` | Inline SVG icons (`Icon name=…`) |
| `Skeleton.tsx` | `TodaySkeleton`, `ListSkeleton` |
| `ServiceWorkerRegistration.tsx` | Registers `public/sw.js` |

### Library (`lib/`)
| File | Description |
|---|---|
| `types.ts` | `User`, `Set`, `Card`, `Progress`, `ConjugationProgress`, `Conjugations`, `ConjugationForms`, `AdjForms`, `WordType`, `Pronoun`, `SavedTranslation` |
| `paths.ts` | The 4 paths / 19 topics, modes per path, gating (`modeAvailability`) |
| `prefs.ts` | `theme` / `imm` / `layout` cookies: values, server parsing, `setPref()` on the client |
| `i18n.ts` | `STRINGS` (Italian/English pairs), `t()`, `label()`, `plainText()` |
| `nav.ts` | Tabs, `tabForPath`, `showsTabBar`, `isMissingRoute` (proxy 404s) |
| `motion.ts` | `tokenMs()` (unit-aware: the CSS build turns `250ms` into `.25s`), `reducedMotion()`, `reflow()` |
| `queries.ts` | Server-only loaders: overview, review deck, study set, edit topic, saved, topic choices |
| `overview.ts` | Pure study numbers for Oggi/Impara/paths |
| `study.ts`, `study-page.ts` | Pure deck builders and labels; shared setup for study routes |
| `srs.ts` | `calculateNextReview()` (simplified SM-2), `isDueToday`, `countDueAndNew` |
| `progress-client.ts` | Fire-and-forget progress saves, tracked so Torna a Oggi can wait for them |
| `cards.ts` | Validation for card/topic writes, snapshot parsing, `conjugateRegular` |
| `forms.ts` | `activeForms()`: which present forms are on (`conjugations.off`) |
| `snapshots.ts` | Server-only: snapshot cards/topics (with both users' progress) before delete; restore them |
| `saved.ts` | Salvate: search, day grouping, saved → card |
| `time.ts` | Local-time wording via the `tz` cookie |
| `quiz.ts` | `selectDistractors()` |
| `users.ts`, `api-helpers.ts`, `supabase.ts`, `utils.ts` | Users; `getUserIdFromCookie()`/`getToday()`/`unauthorized()`/`notFound()`; server client; `shuffleArray()` |

### `proxy.ts`
Middleware: unauthenticated → `/login`; signed in on `/login` → `/home`; API routes pass through; `isMissingRoute` URLs (a path slug that isn't one of the four, a topic id that isn't a uuid) are rewritten to a real 404.

### Scripts (`scripts/`)
Run with `npx tsx scripts/<name>.ts`. `regroup-cards`, `seed-chapters` and `reset-content` are dry runs unless given `--confirm`; the older scripts write immediately, so don't run them against the live database.

| File | Description |
|---|---|
| `regroup-cards.ts` (+ `lib/regroup-plan.ts`) | Regrouped the 6 chapter sets into 4 paths / 19 topics (applied 2026-09-26) |
| `seed-chapters.ts`, `data/chapters.ts`, `reset-content.ts` | Chapter content seed and reset |
| `seed.ts`, `seed-conjugations.ts`, `migrate-conjugation-cards.ts` | Older seeds |
| `backfill-gender.ts`, `backfill-plurals.ts`, `backfill-examples.ts`, `verify-translations.ts` | One-off backfills and checks |
| `build-icons.ts` | Renders the app icon (`docs/design/app-icon.svg`, "Il mazzo") into the favicon, iPhone icon and Android manifest icons (any + maskable) |

### Migrations (`supabase/migrations/`)
001 schema · 002 conjugations · 003 SRS · 004 examples · 005 gender · 006 plural · 007 chapter overhaul (card metadata, `sentences`) · 008 `saved_translations` · 009 `saved_translations.user_id` · 010 `conjugation_progress`. All applied.

---

## Design System (Notte)

The living prototype is `docs/design/notte-prototype.html` (also https://claude.ai/artifact/6Bq6WChMAyXVkkVXhxEsw2); copy values from it rather than approximating. The plan is `docs/notte-redesign-plan.md`.

### Themes: Giorno and Notte
Chosen in the profile sheet (no automatic switching; default **Notte**). The `theme` cookie is stamped on `<html data-mode="notte|giorno">` by the server, so there's no flash; a theme change snaps (no transitions for two frames).

| Token | Notte | Giorno | Use |
|---|---|---|---|
| `--bg` | `#12100E` | `#F6F1E9` | Ground |
| `--surf` / `--surf2` | `#1C1916` / `#25211D` | `#FFFCF7` / `#EFE8DD` | Surfaces |
| `--ink` / `--ink2` | `#F2EDE6` / `#B9B0A4` | `#221C16` / `#675D52` | Text / secondary text |
| `--hl` | `rgba(255,255,255,.08)` | `rgba(34,28,22,.1)` | Hairlines |
| `--ac` | `#E0A458` | `#E0A458` | Ambra fill (the only accent) |
| `--ac-t` | `#E0A458` | `#8A5510` | Ambra as text |
| `--ac-line` | `#E0A458` | `#A86F24` | Ambra lines, progress |
| `--on-ac` | `#12100E` | `#221C16` | Label on a filled button |
| `--ac-edge` | transparent | `#A86F24` | Filled-button edge (required in Giorno) |
| `--ok` / `--no` | `#86C79A` / `#F07F72` | `#2E7449` / `#B03F2E` | Lo so / Ancora |

Also: `--wash`, `--wash2`, `--glass`, `--glass-sheet`, `--top-glass`, `--dim`, `--grab`, `--track`, `--knob`, `--face-*`, `--core-*`, glow and grain values; all in `app/globals.css`. Tailwind colors map them (`bg-surf`, `text-ink2`, `text-ac-t` …). There are no `qz-*` tokens any more.

### Motion tokens
`--d-micro 150ms`, `--d-small 250ms`, `--d-medium 400ms`, `--d-large 550ms`, `--stagger 40ms`; easings `--e-standard`, `--e-decel`, `--e-accel`, `--e-sharp` (Tailwind `ease-*`). Presses scale to .96 over `--d-micro`; push/back/tab use view transitions; sheets rise decel and leave accel. Read tokens from script with `tokenMs()`, never `parseFloat`. Reduced motion: durations drop to 150ms, stagger to 0, movement becomes fades, no shake or breathing. Every state change also leaves a static cue. Nothing loops except the glow while audio plays.

### Utilities
- `glass`: bars and sheets only.
- `press`: scale .96 on press.
- `ser`: Fraunces with optical sizing (Italian words and headings).
- `tab-n`: tabular numbers. `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe`: safe areas.

### Bilingual labels and immersion
Every interface string is an Italian/English pair (`lib/i18n.ts`), rendered by `<Bi>`. The `imm` cookie (`en` / `mix` / `it`, default **mix**) is stamped as `data-imm`, and CSS shows the right half: Mix shows Italian with a smaller English beside it (`.nm-st` stacks it below; `.nm-x` / `itOnlyInMix` hides the English in Mix). Every Italian string carries `lang="it"`; `<html lang="en">`.

### Versione desktop
Only from the profile sheet (`layout` cookie → `data-layout="desktop"`); nothing switches automatically. Pages widen to 56rem (`max-w-4xl`), study screens to 42rem, and from 1024px the tab bar becomes a left rail with the page centered beside it. Without the cookie the phone layout stays as it is, centered at 560px (`--page-max` in `app/shell.css`) on a wide window.

### Conventions
- Every `<button>` has `type="button"` unless it submits.
- Styles are class-based in the `app/*.css` file for that area; inline `style` only for dynamic values (widths, CSS variables). No inline shadows, no emoji as UI.
- Targets ≥ 44px; answers in the bottom third on study screens; icon + label + color on every answer.
- Deleting saved rows and cards is immediate with Annulla in the undo bar; deleting a card or topic uses a two-step inline confirm, never `confirm()`.

---

## Key Patterns

- **Server components** load data through `lib/queries.ts` (service role, no HTTP to our own API) and pass it to client components. Decks are shuffled on the server so hydration matches.
- **Client components** call the API routes for writes. Progress saves are fire-and-forget but tracked (`lib/progress-client.ts`).
- **Due vs new:** a card never reviewed (`next_review_at` null) is new, not due. Oggi's due number = due cards + due conjugation forms, and Ripasso shows exactly those.
- **Days are the learner's:** "today" comes from `getToday()` (`lib/api-helpers.ts`), in the zone from the `tz` cookie the shell sets (UTC until it has), so due counts turn over at their midnight. Loaders and `calculateNextReview()` take that date; never compute today in UTC on the server.
- **SRS:** simplified SM-2 in `lib/srs.ts`. Correct → `interval *= easeFactor`, `easeFactor += 0.1`. Incorrect → `interval = 1`, `easeFactor = max(1.3, easeFactor − 0.2)`, `repetitions = 0`.
- **Enabled filtering:** disabled cards and forms in `conjugations.off` stay out of every study mode.
- **Undo:** DELETE routes return a snapshot; `/api/cards/restore` and `/api/sets/restore` replay it.
- **Both Google APIs** share `GOOGLE_TRANSLATE_API_KEY`.

---

## Testing

```bash
npm run typecheck
npm test            # vitest run
npm run lint
npm run build
```

Tests live in `__tests__/` (prefs, i18n, nav, paths, overview, srs, study, cards, saved, conjugation progress, shell, topic sheet, study modes, edit topic, Traduci, Salvate …). All four commands must pass before shipping.

**Rules for checking in a browser:**
- **Never write to the live database while testing.** Run the dev server (in a worktree: `rm -rf .next; NEXT_PUBLIC_APP_URL=http://localhost:3001 npx next dev -p 3001`) and, before any click that saves, install a `window.fetch` mock that answers every non-GET `/api/*` call except `/api/tts` in the page: cards (PUT, POST, DELETE, restore), sets (POST, DELETE, restore), progress, conjugation progress, plural/example, translate, saved translations, sentence generation.
- Navigate with `window.next.router.push` so the mock survives, and re-check it's installed after any code change or full reload (hot reloads and 404s drop it).
- The dev server log should show no POST/PUT/DELETE except `/api/tts`.
- If a real database change is needed, ask Chance first, then do it (Supabase connector); verify read-only afterwards.
- Check 375×812 in Giorno and Notte, 320px for horizontal overflow, and 1280×800 with Versione desktop on and off. Section 7 of `docs/notte-redesign-plan.md` is the full checklist.
