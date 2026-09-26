/**
 * Study numbers for Oggi, Impara and the path pages, computed from raw rows.
 * Pure, so it runs in tests without a database (see lib/queries.ts for the
 * loading side).
 */
import { PATHS, getPathByCategory, type PathSlug } from './paths'
import { countDueAndNew } from './srs'
import { activeForms } from './forms'
import type { Conjugations, Pronoun } from './types'

export interface RawSet {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
}

export interface RawCard {
  id: string
  set_id: string
  italian: string
  article: string | null
  chapter: number | null
  enabled: boolean | null
  conjugations: Conjugations | null
  sort_order: number
}

export interface RawProgress {
  card_id: string
  known: boolean
  next_review_at: string | null
  last_seen_at: string | null
}

export interface RawFormProgress {
  card_id: string
  pronoun: Pronoun
  next_review_at: string | null
}

export interface TopicStats {
  id: string
  title: string
  description: string | null
  category: string
  /** Every card, on or off. */
  total: number
  /** Enabled cards: what study modes use. */
  active: number
  /** Enabled cards with at least one present-tense form switched on. */
  conjugable: number
  /** Enabled cards marked known. */
  known: number
  due: number
  new: number
  /** Enabled cards per Prego chapter. */
  chapters: Record<number, number>
  /** The first two enabled cards, with their article, e.g. ["la stazione", "la piazza"]. */
  sample: string[]
  lastSeenAt: string | null
}

export interface PathStats {
  slug: PathSlug
  topics: TopicStats[]
  active: number
  known: number
  due: number
  chapters: Record<number, number>
}

export interface Overview {
  topics: TopicStats[]
  paths: PathStats[]
  due: number
  new: number
  /** Prego chapters that have enabled cards, ascending. */
  chapters: number[]
  /** The earliest review after today, or null. */
  nextReviewAt: string | null
  /** The topic studied most recently, if any. */
  lastTopic: TopicStats | null
}

/** "stazione" + "la" → "la stazione"; "università" + "l'" → "l'università". */
export function withArticle(card: { italian: string; article: string | null }): string {
  if (!card.article) return card.italian
  return card.article.endsWith("'") ? `${card.article}${card.italian}` : `${card.article} ${card.italian}`
}

function addChapter(into: Record<number, number>, chapter: number | null, n = 1) {
  if (chapter == null) return
  into[chapter] = (into[chapter] ?? 0) + n
}

export function buildOverview(
  sets: RawSet[],
  cards: RawCard[],
  progress: RawProgress[],
  forms: RawFormProgress[],
  today: string,
): Overview {
  const progressByCard = new Map(progress.map(p => [p.card_id, p]))
  const cardsBySet = new Map<string, RawCard[]>()
  for (const card of [...cards].sort((a, b) => a.sort_order - b.sort_order)) {
    const list = cardsBySet.get(card.set_id) ?? []
    list.push(card)
    cardsBySet.set(card.set_id, list)
  }
  // Forms switched off in Modifica argomento (or no longer on the verb) don't count.
  const studied = new Map(cards.map(c => [c.id, new Set(activeForms(c.conjugations))]))
  forms = forms.filter(f => studied.get(f.card_id)?.has(f.pronoun))
  const formsByCard = new Map<string, RawFormProgress[]>()
  for (const f of forms) formsByCard.set(f.card_id, [...(formsByCard.get(f.card_id) ?? []), f])

  const topics = [...sets]
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    .map((set): TopicStats => {
      const all = cardsBySet.get(set.id) ?? []
      const enabled = all.filter(c => c.enabled !== false)
      const ids = new Set(all.map(c => c.id))
      const { due, new: fresh } = countDueAndNew(
        all,
        progress.filter(p => ids.has(p.card_id)),
        all.flatMap(c => formsByCard.get(c.id) ?? []),
        today,
      )
      const chapters: Record<number, number> = {}
      for (const c of enabled) addChapter(chapters, c.chapter)
      const seen = all.map(c => progressByCard.get(c.id)?.last_seen_at).filter((d): d is string => Boolean(d))
      return {
        id: set.id,
        title: set.title,
        description: set.description,
        category: set.category,
        total: all.length,
        active: enabled.length,
        conjugable: enabled.filter(c => activeForms(c.conjugations).length > 0).length,
        known: enabled.filter(c => progressByCard.get(c.id)?.known).length,
        due,
        new: fresh,
        chapters,
        sample: enabled.slice(0, 2).map(withArticle),
        lastSeenAt: seen.length ? seen.sort().at(-1)! : null,
      }
    })

  const paths = PATHS.map((path): PathStats => {
    const inPath = topics.filter(t => t.category === path.category)
    const chapters: Record<number, number> = {}
    for (const t of inPath) for (const [ch, n] of Object.entries(t.chapters)) addChapter(chapters, Number(ch), n)
    return {
      slug: path.slug,
      topics: inPath,
      active: inPath.reduce((s, t) => s + t.active, 0),
      known: inPath.reduce((s, t) => s + t.known, 0),
      due: inPath.reduce((s, t) => s + t.due, 0),
      chapters,
    }
  })

  const enabledIds = new Set(cards.filter(c => c.enabled !== false).map(c => c.id))
  const upcoming = [...progress, ...forms]
    .filter(p => enabledIds.has(p.card_id) && p.next_review_at && p.next_review_at > today)
    .map(p => p.next_review_at!)
    .sort()

  const lastTopic = topics
    .filter(t => t.lastSeenAt && getPathByCategory(t.category))
    .sort((a, b) => (b.lastSeenAt! > a.lastSeenAt! ? 1 : -1))[0] ?? null

  return {
    topics,
    paths,
    due: topics.reduce((s, t) => s + t.due, 0),
    new: topics.reduce((s, t) => s + t.new, 0),
    chapters: [...new Set(topics.flatMap(t => Object.keys(t.chapters).map(Number)))].sort((a, b) => a - b),
    nextReviewAt: upcoming[0] ?? null,
    lastTopic,
  }
}

/** Ring fill (0–1): known share of the enabled cards. */
export function knownShare(stats: { known: number; active: number }): number {
  return stats.active ? stats.known / stats.active : 0
}
