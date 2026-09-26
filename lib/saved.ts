/**
 * Salvate: grouping saved translations by day, searching them, and turning
 * one into a card. Pure, so the page, the API and the tests share it.
 */
import type { Bilingual } from './paths'
import type { WordType } from './types'

// ── search ──────────────────────────────────────────────────────────────────

/** Lowercase without accents, so "caffe" finds "caffè". */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function matchesQuery(item: { italian: string; english: string }, query: string): boolean {
  const q = normalizeSearch(query)
  return !q || normalizeSearch(`${item.italian} ${item.english}`).includes(q)
}

// ── grouping by day ─────────────────────────────────────────────────────────

/** The calendar day (YYYY-MM-DD) of an instant in a time zone. */
export function dayIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(date)
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export interface DayGroup<T> {
  key: string
  label: Bilingual
  items: T[]
}

function groupFor(created: Date, today: string, timeZone: string): { key: string; label: Bilingual } {
  const age = daysBetween(dayIn(created, timeZone), today)
  if (age <= 0) return { key: 'today', label: { it: 'Oggi', en: 'Today' } }
  if (age === 1) return { key: 'yesterday', label: { it: 'Ieri', en: 'Yesterday' } }
  if (age < 7) return { key: 'week', label: { it: 'Questa settimana', en: 'This week' } }
  const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric', timeZone }
  const it = new Intl.DateTimeFormat('it-IT', opts).format(created)
  return {
    key: dayIn(created, timeZone).slice(0, 7),
    label: { it: it[0].toUpperCase() + it.slice(1), en: new Intl.DateTimeFormat('en-GB', opts).format(created) },
  }
}

/**
 * Oggi, Ieri, Questa settimana (the 5 days before that), then one group per
 * month. Keeps the input order within each group; expects newest first.
 */
export function groupByDay<T extends { created_at: string }>(items: T[], now: Date, timeZone: string): DayGroup<T>[] {
  const today = dayIn(now, timeZone)
  const groups: DayGroup<T>[] = []
  for (const item of items) {
    const { key, label } = groupFor(new Date(item.created_at), today, timeZone)
    let group = groups.find(g => g.key === key)
    if (!group) groups.push(group = { key, label, items: [] })
    group.items.push(item)
  }
  return groups
}

// ── turning a saved translation into a card ─────────────────────────────────

/** A topic offered in Aggiungi a un argomento. */
export interface TopicChoice {
  id: string
  title: string
  category: string
}

/** Longest card text accepted from Salvate; saved translations allow more. */
export const CARD_TEXT_MAX = 300

const ARTICLES: Record<string, 'm' | 'f' | null> = {
  il: 'm', lo: 'm', la: 'f', "l'": null, i: 'm', gli: 'm', le: 'f',
  un: 'm', uno: 'm', una: 'f', "un'": 'f',
}

/** "la stazione" → { article: 'la', rest: 'stazione' }; "l'università" → { article: "l'", … }. */
export function splitArticle(italian: string): { article: string | null; rest: string } {
  const text = italian.trim().replace(/’/g, "'")
  const elided = /^(l'|un')(\S.*)$/i.exec(text)
  if (elided) return { article: elided[1].toLowerCase(), rest: elided[2] }
  const spaced = /^(\S+)\s+(\S.*)$/.exec(text)
  if (spaced && spaced[1].toLowerCase() in ARTICLES) return { article: spaced[1].toLowerCase(), rest: spaced[2] }
  return { article: null, rest: text }
}

/** An Italian word with its article, without doubling one that's already there. */
export function joinArticle(italian: string, article: string | null | undefined): string {
  const word = italian.trim()
  if (!article || splitArticle(word).article) return word
  return article.endsWith("'") ? `${article}${word}` : `${article} ${word}`
}

const WORD_TYPES: Record<string, WordType> = {
  nouns: 'noun',
  verbs: 'verb',
  adjectives: 'adjective',
  phrases: 'phrase',
}

export interface NewCardFields {
  italian: string
  english: string
  article: string | null
  gender: 'm' | 'f' | null
  word_type: WordType | null
}

/**
 * The card a saved translation becomes in a topic of the given category.
 * In Parole a leading article moves to `article` (and sets the gender when
 * the article shows it), as the seeded nouns are stored; everywhere else the
 * text stays whole.
 */
export function cardFromSaved(saved: { italian: string; english: string }, category: string): NewCardFields {
  const italian = saved.italian.trim()
  const english = saved.english.trim()
  const word_type = WORD_TYPES[category] ?? null
  if (word_type === 'noun') {
    const { article, rest } = splitArticle(italian)
    if (article) return { italian: rest, english, article, gender: ARTICLES[article] ?? null, word_type }
  }
  return { italian, english, article: null, gender: null, word_type }
}
