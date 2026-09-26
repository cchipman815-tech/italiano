import { describe, it, expect } from 'vitest'
import { PATHS, type TopicSlug } from '@/lib/paths'
import { CHAPTERS } from '@/scripts/data/chapters'
import {
  EXPECTED_TOPIC_COUNTS,
  EXPECTED_TOTAL,
  buildTopicIndex,
  cardKey,
  planRegroup,
  type LiveCard,
} from '@/scripts/lib/regroup-plan'

/** The seed data shaped like live card rows, one chapter set per chapter. */
function seedAsLive(): LiveCard[] {
  return CHAPTERS.flatMap(ch => ch.cards.map((c, i) => ({
    id: `${ch.chapter}-${i}`,
    set_id: `chapter-${ch.chapter}`,
    chapter: ch.chapter,
    word_type: c.word_type,
    italian: c.italian,
  })))
}

describe('seed data', () => {
  it('has 208 cards across chapters 1–6', () => {
    expect(CHAPTERS.map(c => c.chapter)).toEqual([1, 2, 3, 4, 5, 6])
    expect(CHAPTERS.flatMap(c => c.cards)).toHaveLength(EXPECTED_TOTAL)
  })

  it('gives every card a topic that exists in lib/paths', () => {
    const slugs = new Set(PATHS.flatMap(p => p.topics.map(t => t.slug)))
    for (const card of CHAPTERS.flatMap(c => c.cards)) expect(slugs).toContain(card.topic)
  })

  it('puts each word type on the matching path', () => {
    const pathOf = (topic: TopicSlug) => PATHS.find(p => p.topics.some(t => t.slug === topic))!.category
    const allowed: Record<string, string[]> = {
      noun: ['nouns'],
      verb: ['verbs'],
      adjective: ['adjectives'],
      phrase: ['phrases'],
      expression: ['verbs', 'phrases'],
    }
    for (const card of CHAPTERS.flatMap(c => c.cards)) {
      expect(allowed[card.word_type], card.italian).toContain(pathOf(card.topic))
    }
  })

  it('has a unique chapter + word type + Italian key for every card', () => {
    expect(buildTopicIndex().size).toBe(EXPECTED_TOTAL)
  })

  it('expects counts that cover every topic and sum to 208', () => {
    const slugs = PATHS.flatMap(p => p.topics.map(t => t.slug)).sort()
    expect(Object.keys(EXPECTED_TOPIC_COUNTS).sort()).toEqual(slugs)
    expect(Object.values(EXPECTED_TOPIC_COUNTS).reduce((a, b) => a + b, 0)).toBe(EXPECTED_TOTAL)
  })
})

describe('planRegroup', () => {
  it('matches 208/208 seed cards with every topic count as planned', () => {
    const plan = planRegroup(seedAsLive())
    expect(plan.assignments).toHaveLength(EXPECTED_TOTAL)
    expect(plan.unmatched).toEqual([])
    expect(plan.duplicates).toEqual([])
    expect(plan.countMismatches).toEqual([])
    expect(plan.counts).toEqual(EXPECTED_TOPIC_COUNTS)
    expect(plan.ok).toBe(true)
  })

  it('matches the path totals: 101 / 48 / 34 / 25', () => {
    const { counts } = planRegroup(seedAsLive())
    const totals = PATHS.map(p => p.topics.reduce((sum, t) => sum + counts[t.slug], 0))
    expect(totals).toEqual([101, 48, 34, 25])
  })

  it('numbers cards 1..n within each topic', () => {
    const plan = planRegroup(seedAsLive())
    for (const [topic, n] of Object.entries(plan.counts)) {
      const orders = plan.assignments.filter(a => a.topic === topic).map(a => a.sortOrder)
      expect(orders).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
  })

  it('keeps the two caffè cards apart by chapter', () => {
    const plan = planRegroup(seedAsLive())
    const caffe = plan.assignments.filter(a => a.italian === 'caffè').map(a => a.topic).sort()
    expect(caffe).toEqual(['al-bar', 'la-citta'])
  })

  it('places the plan’s named verbs and phrases', () => {
    const plan = planRegroup(seedAsLive())
    const topicOf = (italian: string) => plan.assignments.find(a => a.italian === italian)!.topic
    for (const v of ['essere', 'avere', 'andare', 'fare', 'bere', 'dovere', 'potere', 'volere', 'piacere']) {
      expect(topicOf(v), v).toBe('irregolari')
    }
    for (const v of ['finire', 'capire', 'preferire', 'pulire']) expect(topicOf(v), v).toBe('verbi-isc')
    for (const p of ["Dov'è...?", "c'è", 'ci sono', 'accanto a', 'sotto']) expect(topicOf(p), p).toBe('dove')
    expect(topicOf('avere fame')).toBe('avere-fare')
  })

  it('fails on a live card the seed does not know', () => {
    const live = [...seedAsLive(), { id: 'x', set_id: 'chapter-1', chapter: 1, word_type: 'noun', italian: 'gelateria' }]
    const plan = planRegroup(live)
    expect(plan.ok).toBe(false)
    expect(plan.unmatched.map(c => c.italian)).toEqual(['gelateria'])
  })

  it('fails when a card is missing and a count drops', () => {
    const live = seedAsLive().filter(c => c.italian !== 'piazza')
    const plan = planRegroup(live)
    expect(plan.ok).toBe(false)
    expect(plan.countMismatches).toEqual([{ topic: 'la-citta', expected: 19, actual: 18 }])
  })

  it('fails when two live cards share a key', () => {
    const live = seedAsLive()
    live.push({ ...live[0], id: 'dupe' })
    const plan = planRegroup(live)
    expect(plan.ok).toBe(false)
    expect(plan.duplicates).toEqual([cardKey(live[0])])
  })
})
