# Saved Translations Design

## Goal

Persist Quick Translate results so both users can revisit them later as a reference list.

## Decisions

- **Saving:** Auto-save on every successful translation; no manual action required.
- **Dismissal:** Entries can be deleted from the `/saved` page, not from the widget.
- **Scope:** Shared list between Chance and Jennifer — no per-user separation.
- **Content:** English + Italian only; no grammar notes, articles, gender, or literal notes.
- **Duplicates:** Upsert on `(english, italian)` — re-translating the same pair updates `created_at` rather than creating a duplicate.

---

## Data Model

New Supabase table: `saved_translations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `english` | text | not null |
| `italian` | text | not null |
| `created_at` | timestamptz | default `now()` |

No `user_id` column — the table is shared. A unique constraint on `(english, italian)` enforces deduplication at the database level.

---

## API Routes

### `GET /api/saved-translations`
Returns all entries ordered by `created_at` descending (newest first).

**Response:**
```json
[
  { "id": "uuid", "english": "hello", "italian": "ciao", "created_at": "..." },
  ...
]
```

### `POST /api/saved-translations`
Upserts a translation. If the `(english, italian)` pair already exists, updates `created_at` to now.

**Request body:**
```json
{ "english": "hello", "italian": "ciao" }
```

**Response:** `201` with the upserted row.

### `DELETE /api/saved-translations/[id]`
Deletes a single entry by UUID.

**Response:** `204` No Content.

---

## TranslatorWidget Changes (`components/TranslatorWidget.tsx`)

After every successful translation result is set, fire-and-forget a `POST /api/saved-translations` call in the background with `{ english, italian }` derived from the result:

- `word` result: `english` = the original input, `italian` = `result.italian`
- `sentence` result: `english` = the original input, `italian` = `result.italian`
- `it-en` result: `english` = `result.english`, `italian` = `result.italian` (the original input)

On success, briefly show a **"Saved ✓"** indicator inside the result card that fades out after 2 seconds. No error UI if the save fails — silent failure only.

No changes to the widget's existing layout or translate behavior.

---

## Home Page Changes (`app/home/page.tsx`)

Fetch the count of saved translations server-side alongside the sets:

```ts
async function getSavedCount(): Promise<number>
```

Pass the count to a new `SavedTranslationsCard` component rendered at the end of the grid, after the "New Set" dashed card.

---

## New Component: `SavedTranslationsCard`

A card styled to match `SetCard` (rounded-2xl, border-2, border-qz-border, white background, qz-shadow-card). Displays:

- A bookmark SVG icon
- Title: **"Saved Translations"**
- Subtitle: `"{count} saved"` (e.g. "12 saved"), or `"No saves yet"` when count is 0
- The entire card is a `<Link href="/saved">` — tapping navigates to the saved list

---

## New Page: `/saved` (`app/saved/page.tsx`)

Server component that fetches all saved translations and passes them to a client component `SavedTranslationsList`.

**Layout:**
- `AppNav` at the top
- Page header: "Saved Translations" title + back link to `/home`
- `SavedTranslationsList` client component below

**`SavedTranslationsList` client component (`components/SavedTranslationsList.tsx`):**

Renders entries as a vertical list of row cards, newest first. Each row:
- **Italian** — large bold text (`text-lg font-bold text-qz-text`)
- **English** — smaller secondary text below (`text-sm text-qz-secondary`)
- **✕ button** on the right — calls `DELETE /api/saved-translations/[id]`, removes the entry from local state optimistically (no confirmation dialog)

**Empty state:** When the list is empty, show:
> "No saved translations yet — use Quick Translate on the home screen to get started."

---

## File Map

| Action | File |
|---|---|
| Create | `app/api/saved-translations/route.ts` (GET + POST) |
| Create | `app/api/saved-translations/[id]/route.ts` (DELETE) |
| Modify | `components/TranslatorWidget.tsx` (auto-save + "Saved ✓" indicator) |
| Modify | `app/home/page.tsx` (fetch count, render SavedTranslationsCard) |
| Create | `components/SavedTranslationsCard.tsx` |
| Create | `app/saved/page.tsx` |
| Create | `components/SavedTranslationsList.tsx` |

---

## Out of Scope

- Per-user saved lists
- Study/practice mode for saved translations
- Grammar details (article, gender, plural, literalNote) in saved entries
- Bulk delete / clear all
