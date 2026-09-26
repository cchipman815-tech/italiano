/**
 * Pure mapping from live cards to Notte topics. No database access, so the
 * tests can run it offline against the seed data.
 *
 * Cards are matched on chapter + word_type + italian. `italian + word_type`
 * alone is not unique: "caffè" is a noun in chapter 1 (La città) and in
 * chapter 5 (Al bar e a tavola).
 */
import { PATHS, type TopicSlug } from '../../lib/paths'
import { CHAPTERS, type SeedChapter } from '../data/chapters'

/** Card counts per topic from docs/notte-redesign-plan.md, section 5. */
export const EXPECTED_TOPIC_COUNTS: Record<TopicSlug, number> = {
  'la-citta': 19, 'a-scuola': 9, 'la-famiglia': 22, 'al-bar': 25, 'la-casa': 26,
  'irregolari': 9, 'verbi-are': 10, 'verbi-ere': 8, 'verbi-ire': 4, 'verbi-isc': 4, 'avere-fare': 13,
  'aspetto': 8, 'carattere': 8, 'umore': 5, 'colori': 8, 'nazionalita': 5,
  'saluti': 10, 'cortesia': 5, 'dove': 10,
}

export const EXPECTED_TOTAL = 208

export interface MatchableCard {
  chapter: number | null
  word_type: string | null
  italian: string
}

export interface LiveCard extends MatchableCard {
  id: string
  set_id: string
}

export interface Assignment {
  cardId: string
  italian: string
  fromSetId: string
  topic: TopicSlug
  /** 1-based position within the topic, in seed order. */
  sortOrder: number
}

export interface RegroupPlan {
  assignments: Assignment[]
  /** Live cards with no seed entry. Any of these fails the plan. */
  unmatched: LiveCard[]
  /** Seed keys matched by more than one live card. */
  duplicates: string[]
  counts: Record<TopicSlug, number>
  countMismatches: { topic: TopicSlug; expected: number; actual: number }[]
  ok: boolean
}

export function cardKey(card: MatchableCard): string {
  return `${card.chapter ?? '?'}|${card.word_type ?? '?'}|${card.italian}`
}

interface SeedSlot {
  topic: TopicSlug
  /** Global seed position, used to order cards within a topic. */
  index: number
}

/** Maps every seed card's key to its topic. Throws if two seed cards share a key. */
export function buildTopicIndex(chapters: SeedChapter[] = CHAPTERS): Map<string, SeedSlot> {
  const index = new Map<string, SeedSlot>()
  let i = 0
  for (const ch of chapters) {
    for (const card of ch.cards) {
      const key = cardKey({ chapter: ch.chapter, word_type: card.word_type, italian: card.italian })
      if (index.has(key)) throw new Error(`Duplicate seed card key: ${key}`)
      index.set(key, { topic: card.topic, index: i++ })
    }
  }
  return index
}

function emptyCounts(): Record<TopicSlug, number> {
  return Object.fromEntries(PATHS.flatMap(p => p.topics.map(t => [t.slug, 0]))) as Record<TopicSlug, number>
}

export function planRegroup(
  liveCards: LiveCard[],
  chapters: SeedChapter[] = CHAPTERS,
  expected: Record<TopicSlug, number> = EXPECTED_TOPIC_COUNTS,
): RegroupPlan {
  const index = buildTopicIndex(chapters)
  const unmatched: LiveCard[] = []
  const seen = new Map<string, number>()
  const matched: { card: LiveCard; slot: SeedSlot }[] = []

  for (const card of liveCards) {
    const key = cardKey(card)
    const slot = index.get(key)
    if (!slot) {
      unmatched.push(card)
      continue
    }
    seen.set(key, (seen.get(key) ?? 0) + 1)
    matched.push({ card, slot })
  }

  const duplicates = [...seen].filter(([, n]) => n > 1).map(([key]) => key)

  matched.sort((a, b) => a.slot.index - b.slot.index)
  const counts = emptyCounts()
  const assignments: Assignment[] = matched.map(({ card, slot }) => ({
    cardId: card.id,
    italian: card.italian,
    fromSetId: card.set_id,
    topic: slot.topic,
    sortOrder: ++counts[slot.topic],
  }))

  const countMismatches = (Object.keys(expected) as TopicSlug[])
    .filter(topic => counts[topic] !== expected[topic])
    .map(topic => ({ topic, expected: expected[topic], actual: counts[topic] }))

  return {
    assignments,
    unmatched,
    duplicates,
    counts,
    countMismatches,
    ok: unmatched.length === 0 && duplicates.length === 0 && countMismatches.length === 0,
  }
}
