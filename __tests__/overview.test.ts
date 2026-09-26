import { describe, it, expect } from 'vitest'
import { buildOverview, knownShare, withArticle, type RawCard, type RawSet } from '@/lib/overview'

const TODAY = '2026-09-26'

const sets: RawSet[] = [
  { id: 'citta', title: 'La città', description: 'In the city', category: 'nouns', sort_order: 1 },
  { id: 'are', title: 'Verbi in -are', description: '-are verbs', category: 'verbs', sort_order: 7 },
  { id: 'old', title: 'Chapter 9', description: null, category: 'general', sort_order: 99 },
]

const PARLARE = { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' }
const PAGARE = { io: 'pago', tu: 'paghi', 'lui/lei': 'paga', noi: 'paghiamo', voi: 'pagate', loro: 'pagano' }

function card(id: string, set_id: string, extra: Partial<RawCard> = {}): RawCard {
  return { id, set_id, italian: id, article: null, chapter: 1, enabled: true, conjugations: null, sort_order: 0, ...extra }
}

const cards: RawCard[] = [
  card('stazione', 'citta', { article: 'la', sort_order: 1 }),
  card('università', 'citta', { article: "l'", sort_order: 2 }),
  card('museo', 'citta', { article: 'il', sort_order: 3, chapter: 2 }),
  card('teatro', 'citta', { article: 'il', sort_order: 4, enabled: false }),
  card('parlare', 'are', { conjugations: { present: PARLARE, off: ['voi'] }, chapter: 3 }),
  card('pagare', 'are', { conjugations: { present: PAGARE }, chapter: 5 }),
  card('capire', 'are', { conjugations: { present: PAGARE, off: ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'] }, chapter: 5, enabled: true }),
]

const progress = [
  { card_id: 'stazione', known: true, next_review_at: '2026-09-25', last_seen_at: '2026-09-20T10:00:00Z' },
  { card_id: 'università', known: false, next_review_at: '2026-09-28', last_seen_at: '2026-09-24T10:00:00Z' },
  { card_id: 'teatro', known: true, next_review_at: '2026-09-01', last_seen_at: '2026-09-25T10:00:00Z' },
  { card_id: 'parlare', known: true, next_review_at: '2026-09-27', last_seen_at: '2026-09-22T10:00:00Z' },
]

const forms = [
  { card_id: 'parlare', pronoun: 'io' as const, next_review_at: '2026-09-26' },
  { card_id: 'parlare', pronoun: 'tu' as const, next_review_at: '2026-09-27' },
  // Switched off in Modifica argomento: not counted.
  { card_id: 'parlare', pronoun: 'voi' as const, next_review_at: '2026-09-20' },
]

const overview = buildOverview(sets, cards, progress, forms, TODAY)
const topic = (id: string) => overview.topics.find(t => t.id === id)!

describe('withArticle', () => {
  it('joins an elided article without a space', () => {
    expect(withArticle({ italian: 'università', article: "l'" })).toBe("l'università")
    expect(withArticle({ italian: 'stazione', article: 'la' })).toBe('la stazione')
    expect(withArticle({ italian: 'Ciao', article: null })).toBe('Ciao')
  })
})

describe('buildOverview', () => {
  it('counts each topic from its enabled cards', () => {
    const citta = topic('citta')
    expect(citta).toMatchObject({ total: 4, active: 3, known: 1, due: 1, new: 1 })
    expect(citta.sample).toEqual(['la stazione', "l'università"])
    expect(citta.chapters).toEqual({ 1: 2, 2: 1 })
  })

  it('adds due conjugation forms to the verb topic, skipping forms switched off', () => {
    // capire has every form off, so it's not conjugable; parlare's voi is due but off.
    expect(topic('are')).toMatchObject({ active: 3, conjugable: 2, due: 1, new: 2 })
  })

  it('totals due and new across topics, ignoring disabled cards', () => {
    expect(overview.due).toBe(2)
    expect(overview.new).toBe(3)
  })

  it('rolls topics up into their paths', () => {
    const parole = overview.paths.find(p => p.slug === 'parole')!
    expect(parole).toMatchObject({ active: 3, known: 1, due: 1 })
    expect(parole.chapters).toEqual({ 1: 2, 2: 1 })
    expect(overview.paths.find(p => p.slug === 'frasi')!.topics).toEqual([])
  })

  it('lists the chapters that have enabled cards', () => {
    expect(overview.chapters).toEqual([1, 2, 3, 5])
  })

  it('finds the next review after today among enabled cards', () => {
    expect(overview.nextReviewAt).toBe('2026-09-27')
  })

  it('continues the topic in a path that was studied most recently', () => {
    // teatro (now switched off) was seen last; that still counts as studying La città.
    expect(overview.lastTopic?.id).toBe('citta')
  })

  it('keeps sets outside the paths as topics without a path', () => {
    expect(topic('old').category).toBe('general')
    expect(overview.paths.flatMap(p => p.topics).some(t => t.id === 'old')).toBe(false)
  })
})

describe('knownShare', () => {
  it('is the known fraction of enabled cards, and 0 for an empty topic', () => {
    expect(knownShare({ known: 1, active: 4 })).toBe(0.25)
    expect(knownShare({ known: 0, active: 0 })).toBe(0)
  })
})
