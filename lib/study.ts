/**
 * Decks and labels for the study modes. Pure, so pages build every deck on
 * the server (the client would shuffle differently during hydration) and
 * tests run without a browser.
 */
import type { Bilingual } from './paths'
import type { Card, ConjugationForms, Pronoun } from './types'
import { withArticle } from './overview'
import { selectDistractors } from './quiz'
import { shuffleArray } from './utils'

export type Direction = 'it-en' | 'en-it'

export function parseDirection(value: string | undefined): Direction {
  return value === 'en-it' ? 'en-it' : 'it-en'
}

/** The Italian as a learner should see it: nouns with their article ("la stazione"). */
export function italianOf(card: Pick<Card, 'italian' | 'article'>): string {
  return withArticle({ italian: card.italian, article: card.article ?? null })
}

/* ─── Card labels ───────────────────────────────────────────────────────────── */

const WORD_TYPE_IT: Record<string, string> = {
  noun: 'nome',
  verb: 'verbo',
  adjective: 'aggettivo',
  phrase: 'frase',
  expression: 'espressione',
}

/** The small line under the word, e.g. "nome · pl. le stazioni" or "verbo · capisco, capisci, capisce…". */
export function kickFor(card: Card): string | null {
  const type = card.word_type ? WORD_TYPE_IT[card.word_type] : null
  const present = card.conjugations?.present
  if (card.word_type === 'noun' || (!type && card.gender)) {
    return [type ?? 'nome', card.plural && `pl. ${card.plural}`].filter(Boolean).join(' · ')
  }
  if (present) {
    return `${type ?? 'verbo'} · ${present.io}, ${present.tu}, ${present['lui/lei']}…`
  }
  return type
}

/** GenderBadge's text: "la · f", or just "f" when there's no article. */
export function genderChip(card: Pick<Card, 'gender' | 'article'>): string | null {
  if (!card.gender) return null
  return card.article ? `${card.article} · ${card.gender}` : card.gender
}

/** Where a card lives, for the tag in a card's corner. */
export interface CardPlace {
  path: Bilingual | null
  topic: string
}

/* ─── Quiz and Ascolto ──────────────────────────────────────────────────────── */

export interface ChoiceQuestion {
  card: Card
  options: Card[]
  correctIndex: number
}

/** Up to `count` questions, each with the right answer and 3 distractors from the same deck. */
export function buildQuestions(cards: Card[], count = 20): ChoiceQuestion[] {
  return shuffleArray(cards).slice(0, count).map(card => {
    const options = shuffleArray([card, ...selectDistractors(cards, card, 3)])
    return { card, options, correctIndex: options.findIndex(o => o.id === card.id) }
  })
}

/* ─── Abbina ────────────────────────────────────────────────────────────────── */

export interface MatchRound {
  /** The Italian column, top to bottom. */
  pairs: Card[]
  /** The English column: indexes into `pairs`, shuffled so rows don't line up. */
  englishOrder: number[]
}

/**
 * Rounds of `size` pairs. A remainder of 1 or 2 joins the last round instead
 * of making a round too small to be a puzzle.
 */
export function buildMatchRounds(cards: Card[], size = 4): MatchRound[] {
  const shuffled = shuffleArray(cards)
  const chunks: Card[][] = []
  for (let i = 0; i < shuffled.length; i += size) chunks.push(shuffled.slice(i, i + size))
  if (chunks.length > 1 && chunks.at(-1)!.length < 3) {
    const tail = chunks.pop()!
    chunks[chunks.length - 1] = [...chunks.at(-1)!, ...tail]
  }
  return chunks.map(pairs => ({ pairs, englishOrder: shuffleEnglish(pairs.length) }))
}

/** A shuffled 0…n-1 that never leaves every row across from its own pair. */
function shuffleEnglish(n: number): number[] {
  const identity = Array.from({ length: n }, (_, i) => i)
  if (n < 2) return identity
  for (let tries = 0; tries < 10; tries++) {
    const order = shuffleArray(identity)
    if (order.some((v, i) => v !== i)) return order
  }
  return [...identity.slice(1), 0]
}

/* ─── Coniugazioni ──────────────────────────────────────────────────────────── */

export const PRONOUNS: Pronoun[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']

const PRONOUN_EN: Record<Pronoun, string> = {
  io: 'I',
  tu: 'you',
  'lui/lei': 'he/she',
  noi: 'we',
  voi: 'you all',
  loro: 'they',
}

export function isPronoun(value: unknown): value is Pronoun {
  return typeof value === 'string' && (PRONOUNS as string[]).includes(value)
}

/** "to speak" → "to speak"; "speak" → "to speak". */
export function verbEnglish(english: string): string {
  const e = english.trim()
  return /^to\s/i.test(e) ? e : `to ${e}`
}

/** English present tense of a verb phrase's first word: "speak" → "speaks" for he/she, "be" → "am" for I. */
function conjugateEnglish(base: string, pronoun: Pronoun): string {
  const [verb, ...rest] = base.split(/\s+/)
  const tail = rest.length ? ` ${rest.join(' ')}` : ''
  const v = verb.toLowerCase()
  if (v === 'be') return (pronoun === 'io' ? 'am' : pronoun === 'lui/lei' ? 'is' : 'are') + tail
  if (pronoun !== 'lui/lei') return base
  if (v === 'have') return `has${tail}`
  if (/[^aeiou]y$/.test(v)) return `${verb.slice(0, -1)}ies${tail}`
  if (/(s|sh|ch|x|z|o)$/.test(v)) return `${verb}es${tail}`
  return `${verb}s${tail}`
}

/** "to speak", "noi" → "we speak"; "to finish", "lui/lei" → "he/she finishes". */
export function formEnglish(english: string, pronoun: Pronoun): string {
  const base = english.trim().split(/[,;/]/)[0].trim().replace(/^to\s+/i, '')
  return `${PRONOUN_EN[pronoun]} ${conjugateEnglish(base, pronoun)}`
}

export interface ConjugationItem {
  card: Card
  pronoun: Pronoun
  /** The conjugated form, e.g. "parlo". */
  form: string
}

/**
 * Every present-tense form of every verb, one verb at a time with its
 * pronouns in order (so the pronoun strip reads left to right). Verbs with
 * forms due today come first; the rest are shuffled.
 */
export function buildConjugationDeck(cards: Card[], dueCardIds: ReadonlySet<string> = new Set()): ConjugationItem[] {
  const verbs = shuffleArray(cards.filter(c => c.conjugations?.present))
  const ordered = [...verbs.filter(c => dueCardIds.has(c.id)), ...verbs.filter(c => !dueCardIds.has(c.id))]
  return ordered.flatMap(card => {
    const present = card.conjugations!.present as ConjugationForms
    return PRONOUNS.filter(p => present[p]).map(pronoun => ({ card, pronoun, form: present[pronoun] }))
  })
}

/* ─── Ripasso ───────────────────────────────────────────────────────────────── */

/** One swipe in Ripasso: a card, or a conjugation form that came due. */
export type ReviewItem =
  | { kind: 'card'; card: Card }
  | { kind: 'form'; card: Card; pronoun: Pronoun; form: string }

/**
 * Ripasso's deck from the cards in scope: those due, then the due forms of
 * enabled verbs. Disabled cards and forms a verb no longer has drop out.
 */
export function reviewItems(
  cards: Card[],
  dueCardIds: ReadonlySet<string>,
  dueForms: { card_id: string; pronoun: Pronoun }[],
): ReviewItem[] {
  const enabled = new Map(cards.filter(c => c.enabled !== false).map(c => [c.id, c]))
  const items: ReviewItem[] = [...enabled.values()].filter(c => dueCardIds.has(c.id)).map(card => ({ kind: 'card', card }))
  for (const { card_id, pronoun } of dueForms) {
    const card = enabled.get(card_id)
    const form = card?.conjugations?.present?.[pronoun]
    if (card && form) items.push({ kind: 'form', card, pronoun, form })
  }
  return items
}

export function reviewItemKey(item: ReviewItem): string {
  return item.kind === 'card' ? item.card.id : `${item.card.id}:${item.pronoun}`
}

/** "la stazione", or "(noi) parliamo" for a form. */
export function reviewItemLabel(item: ReviewItem): string {
  return item.kind === 'card' ? italianOf(item.card) : `(${item.pronoun}) ${item.form}`
}

/* ─── Abbina best time ──────────────────────────────────────────────────────── */

/** 83 → "1:23". */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** A short list for "Tornano domani: …", e.g. "la stazione, il conto e altre 2". */
export function listWords(words: string[], max = 3): Bilingual {
  const shown = words.slice(0, max).join(', ')
  const rest = words.length - max
  if (rest <= 0) return { it: shown, en: shown }
  return { it: rest === 1 ? `${shown} e un'altra` : `${shown} e altre ${rest}`, en: `${shown} and ${rest} more` }
}

/** A study screen's back button: where it goes and its label. */
export interface BackLink {
  href: string
  label: Bilingual | string
}
