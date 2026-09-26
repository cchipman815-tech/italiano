/**
 * Validation for card and topic writes from Modifica argomento and Nuovo
 * argomento, and the snapshots that let a delete be undone with its
 * progress intact. Pure, so tests run without a database.
 */
import { PRONOUNS } from './forms'
import { isPathCategory } from './paths'
import { CARD_TEXT_MAX, splitArticle } from './saved'
import type { AdjForms, Card, ConjugationForms, Conjugations, Pronoun, Set, WordType } from './types'
import { isValidUserId } from './users'

/** Topic names are short: they're row labels and sheet headings. */
export const TOPIC_TITLE_MAX = 60
/** Prego has 18 chapters. */
export const CHAPTER_MAX = 18

const WORD_TYPES: WordType[] = ['noun', 'verb', 'adjective', 'phrase', 'expression']
const ADJ_KEYS = ['ms', 'fs', 'mp', 'fp'] as const

type Result<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

function text(value: unknown, max = CARD_TEXT_MAX): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : null
}

function optionalText(value: unknown, max = CARD_TEXT_MAX): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return text(value, max) ?? undefined
}

export function isChapter(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= CHAPTER_MAX
}

function isPronounList(value: unknown): value is Pronoun[] {
  return Array.isArray(value) && value.every(p => (PRONOUNS as unknown[]).includes(p))
}

/** `{ present: { io, tu, … }, off?: [...] }`, or null. Undefined when invalid. */
export function parseConjugations(value: unknown): Conjugations | null | undefined {
  if (value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  const { present, off } = value as { present?: unknown; off?: unknown }
  if (typeof present !== 'object' || present === null) return undefined
  const forms = {} as ConjugationForms
  for (const p of PRONOUNS) {
    const form = (present as Record<string, unknown>)[p]
    if (typeof form !== 'string' || form.length > 60) return undefined
    forms[p] = form.trim()
  }
  if (off !== undefined && !isPronounList(off)) return undefined
  return off?.length ? { present: forms, off: [...new Set(off)] } : { present: forms }
}

function parseAdjForms(value: unknown): AdjForms | null | undefined {
  if (value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  const forms = {} as AdjForms
  for (const k of ADJ_KEYS) {
    const form = (value as Record<string, unknown>)[k]
    if (typeof form !== 'string' || form.length > 60) return undefined
    forms[k] = form.trim()
  }
  return forms
}

/** The fields a new card may carry. */
export type NewCard = Pick<Card, 'italian' | 'english'> &
  Partial<Pick<Card, 'enabled' | 'article' | 'gender' | 'plural' | 'word_type' | 'chapter' | 'conjugations'>>

/** Body of POST /api/sets/[id]/cards. Italian and English are required; the rest is optional. */
export function parseNewCard(body: unknown): Result<NewCard> {
  if (typeof body !== 'object' || body === null) return fail('Expected a JSON object')
  const b = body as Record<string, unknown>
  const italian = text(b.italian)
  const english = text(b.english)
  if (!italian || !english) return fail(`italian and english are required (up to ${CARD_TEXT_MAX} characters)`)

  const card: NewCard = { italian, english }
  if (b.enabled !== undefined) {
    if (typeof b.enabled !== 'boolean') return fail('enabled must be true or false')
    card.enabled = b.enabled
  }
  const article = optionalText(b.article, 4)
  if (article === undefined && b.article !== undefined) return fail('article is too long')
  if (article !== undefined) card.article = article
  if (b.gender !== undefined) {
    if (b.gender !== null && b.gender !== 'm' && b.gender !== 'f') return fail("gender must be 'm', 'f' or null")
    card.gender = b.gender
  }
  const plural = optionalText(b.plural)
  if (plural === undefined && b.plural !== undefined) return fail('plural is too long')
  if (plural !== undefined) card.plural = plural
  if (b.word_type !== undefined) {
    if (b.word_type !== null && !WORD_TYPES.includes(b.word_type as WordType)) return fail('Unknown word_type')
    card.word_type = b.word_type as WordType | null
  }
  if (b.chapter !== undefined) {
    if (b.chapter !== null && !isChapter(b.chapter)) return fail(`chapter must be 1–${CHAPTER_MAX} or null`)
    card.chapter = b.chapter as number | null
  }
  if (b.conjugations !== undefined) {
    const conjugations = parseConjugations(b.conjugations)
    if (conjugations === undefined) return fail('conjugations must be { present: { io, tu, lui/lei, noi, voi, loro } }')
    card.conjugations = conjugations
  }
  return { ok: true, value: card }
}

/** Body of POST /api/sets: a new topic in one of the four paths. */
export function parseNewTopic(body: unknown): Result<{ title: string; category: string }> {
  if (typeof body !== 'object' || body === null) return fail('Expected a JSON object')
  const { title, category } = body as Record<string, unknown>
  const name = text(title, TOPIC_TITLE_MAX)
  if (!name) return fail(`title is required (up to ${TOPIC_TITLE_MAX} characters)`)
  if (!isPathCategory(category)) return fail('category must be one of the four paths')
  return { ok: true, value: { title: name, category } }
}

/* ─── Articles and regular verbs, for Aggiungi carta and Coniuga ───────────── */

/** The gender an article shows: "la" → f, "il" → m; "l'" shows none. */
export function genderOfArticle(article: string | null | undefined): 'm' | 'f' | null {
  if (!article) return null
  const a = article.toLowerCase().replace(/’/g, "'")
  if (['il', 'lo', 'i', 'gli', 'un', 'uno'].includes(a)) return 'm'
  if (['la', 'le', 'una', "un'"].includes(a)) return 'f'
  return null
}

/** Whether the Italian looks like an infinitive (parlare, prendere, dormire, porsi). */
export function looksLikeInfinitive(italian: string): boolean {
  return /^[a-zàèéìòù]+(are|ere|ire|rre|rsi)$/i.test(italian.trim()) && !splitArticle(italian).article
}

/**
 * Present tense of a regular -are / -ere / -ire verb, as a starting point the
 * learner can correct: parlare → parlo, parli, parla…; mangiare drops the
 * doubled i; cercare and pagare keep their hard sound (cerchi, paghiamo).
 * Null for anything that isn't a plain infinitive.
 */
export function conjugateRegular(infinitive: string): ConjugationForms | null {
  const verb = infinitive.trim().toLowerCase()
  const m = /^([a-z]+?)(are|ere|ire)$/.exec(verb)
  if (!m) return null
  const [, stem, ending] = m
  if (ending === 'are') {
    // mangi-are → tu mangi (not mangii); cerc-are → tu cerchi.
    const iStem = stem.endsWith('i') ? stem.slice(0, -1) : /[cg]$/.test(stem) ? `${stem}h` : stem
    return { io: `${stem}o`, tu: `${iStem}i`, 'lui/lei': `${stem}a`, noi: `${iStem}iamo`, voi: `${stem}ate`, loro: `${stem}ano` }
  }
  const vowel = ending === 'ere' ? 'e' : 'i'
  return { io: `${stem}o`, tu: `${stem}i`, 'lui/lei': `${stem}e`, noi: `${stem}iamo`, voi: `${stem}${vowel}te`, loro: `${stem}ono` }
}

/* ─── Undo snapshots ────────────────────────────────────────────────────────── */

export interface ProgressRow {
  user_id: number
  card_id: string
  known: boolean
  last_seen_at: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review_at: string | null
}

export interface FormProgressRow extends ProgressRow {
  tense: string
  pronoun: Pronoun
}

/** A deleted card with both users' progress, so Annulla puts back exactly what was there. */
export interface CardSnapshot {
  card: Card
  progress: ProgressRow[]
  conjugationProgress: FormProgressRow[]
}

/** A deleted topic with its cards. */
export interface TopicSnapshot {
  set: Set
  cards: CardSnapshot[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))
}

function parseProgressRow(value: unknown, cardId: string): ProgressRow | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  if (!isValidUserId(r.user_id) || r.card_id !== cardId) return null
  if (typeof r.known !== 'boolean' || !isTimestamp(r.last_seen_at)) return null
  if (!Number.isInteger(r.interval) || (r.interval as number) < 0 || (r.interval as number) > 36500) return null
  if (typeof r.ease_factor !== 'number' || r.ease_factor < 1 || r.ease_factor > 10) return null
  if (!Number.isInteger(r.repetitions) || (r.repetitions as number) < 0 || (r.repetitions as number) > 10000) return null
  if (r.next_review_at !== null && !(typeof r.next_review_at === 'string' && DATE.test(r.next_review_at))) return null
  return {
    user_id: r.user_id,
    card_id: cardId,
    known: r.known,
    last_seen_at: r.last_seen_at,
    interval: r.interval as number,
    ease_factor: r.ease_factor,
    repetitions: r.repetitions as number,
    next_review_at: r.next_review_at as string | null,
  }
}

function parseFormRow(value: unknown, cardId: string): FormProgressRow | null {
  const base = parseProgressRow(value, cardId)
  if (!base) return null
  const { tense, pronoun } = value as Record<string, unknown>
  if (tense !== 'present' || !(PRONOUNS as unknown[]).includes(pronoun)) return null
  return { ...base, tense, pronoun: pronoun as Pronoun }
}

/** A card snapshot from the client, checked field by field. `setId` pins it to the topic. */
export function parseCardSnapshot(value: unknown, setId?: string): Result<CardSnapshot> {
  if (typeof value !== 'object' || value === null) return fail('Expected a snapshot')
  const { card, progress, conjugationProgress } = value as Record<string, unknown>
  if (typeof card !== 'object' || card === null) return fail('Missing card')
  const c = card as Record<string, unknown>
  if (typeof c.id !== 'string' || !UUID.test(c.id)) return fail('Bad card id')
  if (typeof c.set_id !== 'string' || !UUID.test(c.set_id) || (setId && c.set_id !== setId)) return fail('Bad set id')
  if (!Number.isInteger(c.sort_order)) return fail('Bad sort_order')

  const fields = parseNewCard({ ...c, article: c.article ?? null, plural: c.plural ?? null })
  if (!fields.ok) return fields
  const example = c.example ?? null
  if (example !== null && !(typeof example === 'object'
    && text((example as Record<string, unknown>).italian) && text((example as Record<string, unknown>).english))) {
    return fail('Bad example')
  }
  const adjective_forms = parseAdjForms(c.adjective_forms ?? null)
  if (adjective_forms === undefined) return fail('Bad adjective_forms')
  if (c.tense != null && typeof c.tense !== 'string') return fail('Bad tense')

  const rows = Array.isArray(progress) ? progress : []
  const formRows = Array.isArray(conjugationProgress) ? conjugationProgress : []
  if (rows.length > 2 || formRows.length > 12) return fail('Too much progress')
  const parsedRows = rows.map(r => parseProgressRow(r, c.id as string))
  const parsedForms = formRows.map(r => parseFormRow(r, c.id as string))
  if (parsedRows.some(r => !r) || parsedForms.some(r => !r)) return fail('Bad progress row')

  return {
    ok: true,
    value: {
      card: {
        id: c.id,
        set_id: c.set_id,
        sort_order: c.sort_order as number,
        italian: fields.value.italian,
        english: fields.value.english,
        enabled: fields.value.enabled ?? true,
        conjugations: fields.value.conjugations ?? null,
        gender: fields.value.gender ?? null,
        plural: fields.value.plural ?? null,
        article: fields.value.article ?? null,
        word_type: fields.value.word_type ?? null,
        chapter: fields.value.chapter ?? null,
        example: example as Card['example'],
        adjective_forms,
        tense: (c.tense as string | null) ?? null,
      },
      progress: parsedRows as ProgressRow[],
      conjugationProgress: parsedForms as FormProgressRow[],
    },
  }
}

/** A topic snapshot from the client. */
export function parseTopicSnapshot(value: unknown): Result<TopicSnapshot> {
  if (typeof value !== 'object' || value === null) return fail('Expected a snapshot')
  const { set, cards } = value as Record<string, unknown>
  if (typeof set !== 'object' || set === null) return fail('Missing set')
  const s = set as Record<string, unknown>
  if (typeof s.id !== 'string' || !UUID.test(s.id)) return fail('Bad set id')
  const title = text(s.title, 200)
  if (!title || typeof s.category !== 'string' || s.category.length > 40) return fail('Bad title or category')
  if (s.description != null && !text(s.description, 500)) return fail('Bad description')
  if (!Number.isInteger(s.sort_order) || !isTimestamp(s.created_at)) return fail('Bad sort_order or created_at')
  if (!Array.isArray(cards) || cards.length > 500) return fail('Bad cards')

  const parsed: CardSnapshot[] = []
  for (const c of cards) {
    const r = parseCardSnapshot(c, s.id)
    if (!r.ok) return r
    parsed.push(r.value)
  }
  return {
    ok: true,
    value: {
      set: {
        id: s.id,
        title,
        description: (s.description as string | null) ?? null,
        category: s.category,
        sort_order: s.sort_order as number,
        created_at: s.created_at as string,
      },
      cards: parsed,
    },
  }
}
