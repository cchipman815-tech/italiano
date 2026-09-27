# Notte redesign: implementation plan

This is the handoff for building the "Notte" redesign into the Italiano app. Read the whole file before writing code. Chance and Jennifer use the app on their phones about 95% of the time, so everything here is **phone first**.

## 1. Sources of truth

| What | Where |
|---|---|
| Design prototype (every screen, tappable) | `docs/design/notte-prototype.html`, a local copy. The live version is https://claude.ai/artifact/6Bq6WChMAyXVkkVXhxEsw2 (private to Chance; read it with the Artifact tool if you have it). Open the local file in a browser to tap through it. |
| Project conventions | `CLAUDE.md`, especially: every `<button>` gets `type="button"` unless it submits; never expose `SUPABASE_SERVICE_ROLE_KEY`; never commit `.env.local` |
| Existing behavior of every screen | The current components listed in `CLAUDE.md` (File Map) |

**How to use the prototype**
- It's one HTML file. Its CSS holds the exact tokens, spacing and component styles, and its markup shows the structure of each screen.
- The screen index under the phone jumps to any screen, and the "What just moved" panel names every animation's duration and easing.
- Copy values from it. Don't approximate them.

## 2. Decisions already made (don't re-ask)

- **Direction:** Notte, with **Ambra** (`#E0A458`) as the only accent color.
- **Themes:** Giorno (light) and Notte (dark). The user chooses in the profile sheet; there's **no automatic switching**. The default is Notte.
- **Organization:** cards are regrouped from 6 Prego chapter sets into **4 paths / 19 topics**, organized by how you learn them (section 5). The chapter number stays as a quiet filter.
- **Navigation:** a glass tab bar with 4 tabs: **Oggi** (Today), **Impara** (Learn), **Traduci** (Translate), **Salvate** (Saved). The profile is the avatar in the top bar.
- **Italian level:** labels are bilingual, controlled by an "immersion" setting (EN / Mix / IT). The default is **Mix**.
- **Match mode stays.** Today it's orphaned (nothing links to it); link it from the topic sheet.
- **Conjugations mode saves progress** like the other modes, and forms that come due count toward Oggi's due number.
- **Saved translations become individual.** Each user sees only their own. When migrating, existing rows are **copied to both users** so nobody loses anything.
- **Deleting:**
  - Saved rows and cards are deleted immediately, with **Undo** in a bottom bar. The bar stays until it's dismissed or you navigate away.
  - Deleting a card or a topic uses a **two-step inline confirm**, not the browser's `confirm()`.
- **Desktop:** an optional "Versione desktop" switch in the profile sheet (`layout=desktop` cookie). There is **no automatic desktop layout**.
- **Motion:** follow the prototype's motion system exactly (section 4). Nothing loops on its own.

Still open. Use the prototype's choice unless Chance says otherwise:
- whether Giorno looks right
- the overall motion pace
- the arc on the card fling
- whether the glow breathes during pronunciation

## 3. Ground rules for the session

1. **Work in a worktree:** `git worktree add .worktrees/notte-mobile -b feature/notte-mobile`. Merge in phases, one PR per phase (section 8).
2. **Database changes are run by Chance by hand** in the Supabase SQL Editor.
   - Write migration files and scripts, then **stop and ask** before anything writes to live data.
   - Every data script defaults to a dry run and needs `--confirm` to write.
3. **Keep every study flow working at each step.** Keyboard support (space / arrow keys) stays in the flashcard modes.
4. **No new runtime dependencies** unless one is clearly necessary.
   - Animations are CSS transitions, plus the View Transitions API where supported.
   - Icons are inline SVG in `components/StudyIcons.tsx`, recolored with `currentColor`.
5. After each phase: `npm test`, `npm run lint` and `npm run build` must pass. Then check the app in a browser at **375×812** in **both** themes.

## 4. Design system (copy into `app/globals.css`)

### Color tokens
Stamp the theme on `<html data-mode="notte|giorno">` on the server, from a `theme` cookie, so there's no flash on load.

| Token | Notte (default) | Giorno |
|---|---|---|
| `--bg` (ground) | `#12100E` | `#F6F1E9` |
| `--surf` | `#1C1916` | `#FFFCF7` |
| `--surf2` | `#25211D` | `#EFE8DD` |
| `--ink` | `#F2EDE6` (16.3:1) | `#221C16` (14.99:1) |
| `--ink2` | `#B9B0A4` | `#675D52` (5.72:1) |
| `--hl` (hairline) | `rgba(255,255,255,.08)` | `rgba(34,28,22,.1)` |
| `--ac` (Ambra fill) | `#E0A458` | `#E0A458` |
| `--ac-t` (Ambra as text) | `#E0A458` (8.7:1) | `#8A5510` (5.51:1) |
| `--ac-line` | `#E0A458` | `#A86F24` |
| `--on-ac` (label on a filled button) | `#12100E` | `#221C16` (7.72:1) |
| `--ac-edge` (filled-button edge) | transparent | `#A86F24`. Required in Giorno: Ambra on paper is only 1.94:1 |
| `--ok` (know it) | `#86C79A` | `#2E7449` (5.03:1) |
| `--no` (still learning) | `#F07F72` | `#B03F2E` (5.19:1) |

The full set, including the glass, sheet, dim, grab-handle, track and knob tokens, is in the prototype CSS: the `.nm{…}` block and the `[data-mode="giorno"] .nm{…}` block. Port those two blocks verbatim as `:root[data-mode=…]` rules.

### Fonts
Load all three with `next/font/google`:
- **Fraunces** (variable, with italic) for Italian words and headings
- **Geist** for the interface
- **Geist Mono** for small labels and numbers

Map their CSS variables into `@theme inline`. This also fixes today's bug where the `--font-inter` variable is never used.

### Motion tokens
```css
--d-micro: 150ms;  --d-small: 250ms;  --d-medium: 400ms;  --d-large: 550ms;  --stagger: 40ms;
--e-standard: cubic-bezier(.2,0,0,1);  --e-decel: cubic-bezier(0,0,0,1);
--e-accel: cubic-bezier(.3,0,1,1);     --e-sharp: cubic-bezier(.4,0,.2,1);
```

**Rules**
- **Buttons, rows and chips:** press to `scale(.96)` over `--d-micro`.
- **Screen push:** the new screen comes in from the right over `--d-medium` / decel, while the old one moves to −25%, dims, and uses sharp. **Back** takes `--d-small` / accel.
- **Tabs:** cross-fade over `--d-small`, and the pill slides.
- **Sheets:**
  - The dim fades in; the sheet rises over `--d-medium` / decel; rows follow at 40ms stagger, on first open only.
  - Dismiss by dragging past 30% of the height, tapping the dim, or pressing Escape.
  - The exit takes `--d-small` / accel.
- **Card flip:** 3D, over `--d-large` / standard.
- **Swipe commit:** the card flies off on an arc. `translate` uses accel, `transform: translateY` uses decel, plus a rotation. The next card rises from 95%.
- **Quiz answers:**
  - The correct icon grows in: scale .25 → 1 and blur 4px → 0.
  - A wrong pick shakes once (6px, 300ms).
  - A hairline shows the auto-advance: 1.2s in Quiz, 1.8s in Listening.
- **Session complete:** staged entrance, 100ms apart.
- **Theme switch:** snaps. Inject a no-transition class, force a reflow, and remove it after two animation frames.
- **Glow:** it breathes (1.2s cycle) **only while audio plays**.
- **Reduced motion** (`prefers-reduced-motion` media query): durations become 150ms, stagger becomes 0, flips/pushes/sheets/fling become fades, and there's no shake and no breathing.
- **Static cues:** every state change also leaves a static cue (icon, label or color), never motion alone.

The full motion inventory is the table in the prototype's "The motion system" section.

## 5. Content organization (4 paths → 19 topics = 208 cards)

Topics are rows in `sets`. The path is stored in the existing `sets.category` column: `nouns | verbs | adjectives | phrases`. Card ids never change, so **all progress rows survive**.

| Path (`category`) | Topics (card counts) |
|---|---|
| **Parole** · Words (`nouns`, 101) | La città 19 · A scuola 9 · La famiglia 22 · Al bar e a tavola 25 · La casa 26 |
| **Verbi** · Verbs (`verbs`, 48) | Irregolari essenziali 9 (essere, avere, andare, fare, bere, dovere, potere, volere, piacere) · -are 10 · -ere 8 · -ire 4 · -ire con -isc- 4 (finire, capire, preferire, pulire) · Con avere e fare 13 (the idioms) |
| **Descrivere** · Describing (`adjectives`, 34) | Aspetto 8 · Carattere 8 · Umore 5 · Colori 8 · Nazionalità 5 |
| **Frasi** · Phrases (`phrases`, 25) | Saluti e presentazioni 10 · Cortesia 5 · Dove? 10 (Dov'è…?, c'è, ci sono, 7 prepositions of place) |

- **Live data at planning time:** 6 chapter sets, 208 cards (nouns 101, verbs 35, adjectives 34, phrases 23, expressions 15), 199 progress rows and 20 `sentences` rows. Of the sentences, 17 belong to a chapter set and 3 to individual cards.
- **Card content** comes from `scripts/seed-chapters.ts`. Cards store `italian` without the article, and `word_type`, `article`, `gender`, `plural`, `chapter` and `adjective_forms` are separate columns.
- **Study modes per path:**

  | Path | Modes, in order |
  |---|---|
  | Parole | Flashcard · Quiz · Ascolto · Abbina · Frasi |
  | Verbi | Coniugazioni · Flashcard · Quiz · Abbina · Frasi |
  | Descrivere | Flashcard · Quiz · Abbina · Frasi |
  | Frasi | Ascolto · Frasi · Flashcard · Quiz |

  - Quiz, Ascolto (listening) and Abbina (match) need **at least 4 enabled cards**. When a topic has fewer, show the row disabled, with the reason inline: "Servono almeno 4 carte attive · ne hai N" (needs at least 4 active cards · you have N).
- **Oggi's numbers** (fixes a bug where `isDueToday(null)` counts every card that was never studied):
  - **due** = enabled cards with `next_review_at <= today` (null excluded), plus conjugation forms that are due
  - **new** = enabled cards never reviewed

## 6. Phases

### Phase 1: Data (migrations and scripts; Chance runs the SQL)

**`supabase/migrations/009_saved_translations_user.sql`**
- Add `user_id integer references users(id)`.
- Backfill by duplicating every existing row to users 1 and 2.
- Set it `NOT NULL`.
- Drop `saved_translations_pair_unique` and add `unique (user_id, english, italian)`.

**`supabase/migrations/010_conjugation_progress.sql`**
- New table `conjugation_progress`. Columns: `user_id`, `card_id` (the verb card, `on delete cascade`), `tense text default 'present'`, `pronoun text`, `known`, `interval`, `ease_factor`, `repetitions`, `next_review_at date` and `last_seen_at`.
- Add `unique (user_id, card_id, tense, pronoun)`.
- *Why a new table:* the live content has **no per-form conjugation cards**. `ConjugationStudy` builds verb × pronoun items from `cards.conjugations.present`, so those items have no card id to save progress against.

**`scripts/regroup-cards.ts`** (dry run by default; `--confirm` to write)
1. Back up `sets`, `cards` and `sentences` to `backups/<timestamp>.json`, and make sure `backups/` is gitignored.
2. Create the 19 topic sets, with `category` and `sort_order` set.
3. Assign each card with `UPDATE cards SET set_id, sort_order`, using a mapping keyed on `italian + word_type`.
   - Build the mapping from `seed-chapters.ts` together with the taxonomy above.
   - Print per-topic counts, and **fail if any of the 208 cards is unmatched** or any count differs from the table.
4. Delete the 17 chapter-scoped `sentences`. They regenerate per topic through `/api/sentences/generate`.
5. Delete the 6 chapter sets, which are empty by then.

**Other Phase 1 work**
- `scripts/seed-chapters.ts`: give each seed card a `topic` key, so future chapters land in topics. Keep the `chapter` tag.
- New `lib/paths.ts`: path metadata (slug, category, Italian/English labels, blurb, icon, ordered modes, topic order).
- Tests:
  - `lib/paths.ts` covers all 4 categories and the mode gating.
  - A test for the regroup mapping, runnable offline against the seed data, that asserts 208/208 matched and the counts above.

**Checks**
- The dry run prints 208/208 and every count matches.
- After Chance confirms and runs it:
  - there are still 199 progress rows
  - no card has a null `set_id`
  - the chapter filter shows each chapter's cards

### Phase 2: Foundation
- **`app/layout.tsx`:**
  - Load the fonts (section 4).
  - `export const viewport` with `themeColor` per mode, `viewportFit: 'cover'` and `colorScheme`.
  - Read the `theme`, `imm` and `layout` cookies on the server and stamp them as `data-*` attributes on `<html>`.
  - Use `min-h-dvh`.
  - `lang="en"` on `<html>`; every Italian string gets `lang="it"`.
- **`app/globals.css`:**
  - The tokens and motion tokens.
  - A `.glass` utility (bars and sheets only).
  - A fixed film-grain layer (`pointer-events:none`).
  - A global `:focus-visible` ring and safe-area helpers.
  - The reduced-motion block.
  - Temporarily alias the `qz-*` tokens to the new ones, so pages keep working while they migrate one at a time.
- **`app/manifest.ts`:** theme and background colors `#12100E`.
- **New `lib/prefs.ts`:** cookie names, allowed values, `setPref()` on the client, validation on the server.
- **New `lib/i18n.ts`:** `t(key)` returns an Italian/English pair, rendered according to `imm`. Mix shows the Italian with a smaller English line.
- **Tests:** prefs validation, the due/new split and `t()` in all three levels.

### Phase 3: Shell

All new components go in `components/`:

- **`TabBar`**
  - Glass bar with 4 tabs and a sliding pill; the active icon is filled.
  - Uses `usePathname`, and respects the bottom safe area.
  - Hidden on study screens.
- **`LargeTitle`:** collapses into the glass top bar, driven by an IntersectionObserver sentinel.
- **`Sheet`**
  - Detents; a drag handle; Escape closes it; tapping the dim closes it.
  - Focus moves in when it opens and back to the trigger when it closes.
  - `inert` on the background, and `overscroll-behavior: contain`.
- **`ProfileSheet`:** Giorno/Notte, Italian level, "Versione desktop", install app, **Cambia** (switch user, which goes to login) and sign out. It replaces `AppNav`'s dropdown and takes over its install prompt.
- **`SubpageBar`:** a labeled back button.
- **`UndoBar`**
  - A bottom glass bar with a message and an action.
  - `role="status"`.
  - Stays until dismissed or you navigate away.
- **Screen push/back:** use the View Transitions API with the section 4 timing, and fall back to no animation.
- **Retire `AppNav`.** It currently has 11 importers across `app/**`.

### Phase 4: Screens

Build each screen to match the prototype.

| Screen | Route / files | Notes |
|---|---|---|
| Oggi | `app/home/page.tsx` | Italic greeting, due readout with the new count, "Continua" card, 4 path tiles, filled "Ripassa tutto" button above the tabs. `/api/sets` returns `due_cards` and `new_cards` |
| Impara | new `app/learn/page.tsx` | Chapter chips (FLIP filter animation), 4 path cards |
| Path page | new `app/learn/[path]/page.tsx` | Large title, topic rows with rings and due counts, "+ Nuovo argomento" (new topic), "Ripassa tutte le…" (review all) |
| Topic sheet | opens from the path page | Modes for that path, with gating; direction segmented control; Ripassa; "Modifica argomento" (edit topic). Replaces `StudyModePicker`'s layout with a mapped `modes[]` |
| Review | new `app/review/page.tsx` | One route with optional `?path=` and `?cap=`. Reuses `ReviewStudy` and the corrected due logic |
| Traduci | new `app/translate/page.tsx` | Moves `TranslatorWidget` here. EN→IT / IT→EN; result card; saves automatically, with Annulla (undo) in place; error card with Riprova (retry) |
| Salvate | `app/saved/page.tsx` | Per user. Search, grouped by day, swipe left to delete with undo, a row actions sheet (Ascolta, Aggiungi a un argomento, Elimina). "N salvate da te" (N saved by you). Empty state |
| Add to topic | new `POST /api/saved-translations/[id]/card` `{ setId }` | Creates a card from a saved translation. Validates ownership and the lengths of both strings |
| Study modes | `FlashcardStudy`, `ReviewStudy`, `QuizStudy`, `ListeningStudy`, `MatchStudy`, `ConjugationStudy`, `SentencePractice` | Swipe deck: 35% threshold, stamps, arc fling, buttons as well. Nouns show article + gender; adjectives show 4 forms on the back. Listening has a "tap to start" screen. Match uses 2 columns (Italian \| English). Conjugations has a pronoun strip and **saves to `conjugation_progress`** through a new `/api/conjugation-progress` using `calculateNextReview`. Sentences has a first-load skeleton and a feedback bar that waits for "Avanti" (next). Answers sit in the bottom third; targets ≥ 44px; icon + label + color on every answer |
| Session complete | a shared `SessionComplete` component | Worded per mode; staged entrance; back to Oggi, where the due count updates |
| Edit topic | `app/sets/[id]/edit/page.tsx`, `CardEditor.tsx` | Switch per card; details open in place (grid-rows animation); generate plural/example; edit, conjugate and delete with a two-step confirm plus undo; verb groups "3/6 attive"; sticky "Aggiungi carta" (add card) sheet (EN → Translate fills IT, detects gender, optional 6 forms); delete topic with a two-step confirm |
| New topic | a sheet on the path page (replaces `app/sets/new`) | Name (inline error if empty), path picker (sets `category`), optional chapter |
| Chi studia? | `app/login/page.tsx` | Two large avatar buttons with each person's due count; cross-fade into Oggi |
| States | `app/loading.tsx` (+ per segment), `app/error.tsx`, `app/not-found.tsx` | Match the prototype's "Every state" section: skeleton, load error, nothing due, gated mode, empty Salvate, translation failed, not found, undo bar |

Also: `SpeakButton` becomes a 44px SVG button with an `aria-label`, and while it plays, the screen's glow breathes. `GenderBadge` becomes a neutral chip (`la · f`), no pink/blue.

### Phase 5: Desktop version
With `layout=desktop`: containers widen to `max-w-4xl`, and at ≥1024px the tab bar becomes a left rail. It's only switched on from the profile sheet.

### Phase 6: Cleanup
- Remove the `qz-*` aliases and inline shadows, and any leftover emoji used as UI.
- Update the Design System, File Map and Schema sections of `CLAUDE.md`: new tokens, routes, components, and migrations 009 and 010.
- Delete `docs/design/notte-prototype.html` only if Chance asks.

## 7. Verification (before merging each phase)
- `npm test`, `npm run lint` and `npm run build` are clean.
- `npm run dev` and a browser at **375×812**, in **Giorno and Notte**, walking:
  - login → Oggi → Impara → a path → the topic sheet → every mode → session complete → Oggi's count went down
  - `/review?cap=3`
  - Traduci → Salvate (the new item appears; switching user shows the other list)
  - swipe delete + undo
  - edit topic: toggle, open details, delete + undo, add a card
  - new topic
  - change theme and immersion, reload, and confirm there's no flash
- **Reduced motion** on: no flip, slide, shake or breathing, and every state is still readable.
- No horizontal scroll at 320px. Tab bar and bottom bars clear the home indicator.
- Keyboard: Tab order, focus is always visible, Escape closes sheets, flashcard keys still work.
- Before/after screenshots of Oggi, Impara, a path, Studio and Salvate go to Chance.

## 8. Suggested PRs

Phases 1 and 2 can overlap.

1. Data: migrations 009 and 010, `regroup-cards.ts` (dry run only), `lib/paths.ts`, tests
2. Foundation: fonts, tokens, prefs, i18n, theme cookie
3. Shell: tab bar, sheets, profile, undo bar, transitions, `AppNav` retired
4. Oggi, Impara, path, topic sheet, review
5. Traduci, per-user Salvate, add to topic
6. Study modes, session complete, conjugation progress
7. Edit topic, new topic, login, states
8. Desktop toggle, cleanup, `CLAUDE.md`

Once Chance confirms, the regroup runs with `--confirm` between PR 1 and PR 4.
