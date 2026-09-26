import { describe, it, expect } from 'vitest'
import {
  conjugateRegular,
  genderOfArticle,
  looksLikeInfinitive,
  parseCardSnapshot,
  parseConjugations,
  parseNewCard,
  parseNewTopic,
  parseTopicSnapshot,
} from '@/lib/cards'

const CARD_ID = '11111111-1111-4111-8111-111111111111'
const SET_ID = '22222222-2222-4222-8222-222222222222'

const PARLARE = { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' }

function snapshot(extra: Record<string, unknown> = {}) {
  return {
    card: {
      id: CARD_ID, set_id: SET_ID, sort_order: 3, italian: 'stazione', english: 'the station', enabled: true,
      conjugations: null, gender: 'f', plural: 'le stazioni', example: { italian: 'La stazione è qui.', english: 'The station is here.' },
      chapter: 2, article: 'la', word_type: 'noun', adjective_forms: null, tense: 'present',
    },
    progress: [
      { user_id: 1, card_id: CARD_ID, known: true, last_seen_at: '2026-09-20T10:00:00Z', interval: 6, ease_factor: 2.6, repetitions: 2, next_review_at: '2026-09-26' },
    ],
    conjugationProgress: [],
    ...extra,
  }
}

describe('parseNewCard', () => {
  it('needs Italian and English and trims them', () => {
    expect(parseNewCard({ italian: '  panetteria ', english: 'the bakery' })).toEqual({ ok: true, value: { italian: 'panetteria', english: 'the bakery' } })
    expect(parseNewCard({ italian: '', english: 'x' }).ok).toBe(false)
    expect(parseNewCard({ italian: 'x'.repeat(301), english: 'x' }).ok).toBe(false)
  })

  it('keeps the optional fields Aggiungi carta sends', () => {
    const r = parseNewCard({
      italian: 'cantare', english: 'to sing', enabled: true, word_type: 'verb', chapter: 3,
      conjugations: { present: PARLARE, off: ['io', 'io', 'tu'] },
    })
    expect(r).toEqual({ ok: true, value: {
      italian: 'cantare', english: 'to sing', enabled: true, word_type: 'verb', chapter: 3,
      conjugations: { present: PARLARE, off: ['io', 'tu'] },
    } })
  })

  it('rejects bad gender, chapter and word type', () => {
    expect(parseNewCard({ italian: 'a', english: 'b', gender: 'x' }).ok).toBe(false)
    expect(parseNewCard({ italian: 'a', english: 'b', chapter: 19 }).ok).toBe(false)
    expect(parseNewCard({ italian: 'a', english: 'b', word_type: 'adverb' }).ok).toBe(false)
  })
})

describe('parseConjugations', () => {
  it('needs all six forms and known pronouns in off', () => {
    expect(parseConjugations({ present: { io: 'parlo' } })).toBeUndefined()
    expect(parseConjugations({ present: PARLARE, off: ['egli'] })).toBeUndefined()
    expect(parseConjugations(null)).toBeNull()
    expect(parseConjugations({ present: PARLARE, off: [] })).toEqual({ present: PARLARE })
  })
})

describe('parseNewTopic', () => {
  it('needs a name and one of the four paths', () => {
    expect(parseNewTopic({ title: ' Al mercato ', category: 'nouns' })).toEqual({ ok: true, value: { title: 'Al mercato', category: 'nouns' } })
    expect(parseNewTopic({ title: '   ', category: 'nouns' }).ok).toBe(false)
    expect(parseNewTopic({ title: 'Numbers', category: 'numbers' }).ok).toBe(false)
  })
})

describe('articles and verbs', () => {
  it('reads the gender off an article', () => {
    expect(genderOfArticle('la')).toBe('f')
    expect(genderOfArticle('lo')).toBe('m')
    expect(genderOfArticle("l'")).toBeNull()
  })

  it('spots infinitives but not nouns', () => {
    expect(looksLikeInfinitive('cantare')).toBe(true)
    expect(looksLikeInfinitive('la stazione')).toBe(false)
    expect(looksLikeInfinitive('Per favore')).toBe(false)
  })

  it('conjugates regular verbs, keeping the hard sound and dropping a doubled i', () => {
    expect(conjugateRegular('parlare')).toEqual(PARLARE)
    expect(conjugateRegular('cercare')).toMatchObject({ tu: 'cerchi', noi: 'cerchiamo', io: 'cerco' })
    expect(conjugateRegular('mangiare')).toMatchObject({ io: 'mangio', tu: 'mangi', noi: 'mangiamo' })
    expect(conjugateRegular('prendere')).toEqual({ io: 'prendo', tu: 'prendi', 'lui/lei': 'prende', noi: 'prendiamo', voi: 'prendete', loro: 'prendono' })
    expect(conjugateRegular('dormire')).toMatchObject({ voi: 'dormite', loro: 'dormono' })
    expect(conjugateRegular('la casa')).toBeNull()
  })
})

describe('undo snapshots', () => {
  it('accepts a card with its progress', () => {
    const r = parseCardSnapshot(snapshot(), SET_ID)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.card).toMatchObject({ id: CARD_ID, article: 'la', plural: 'le stazioni', chapter: 2 })
  })

  it('rejects progress for another card or user, and a card from another topic', () => {
    const other = { ...snapshot().progress[0], card_id: SET_ID }
    expect(parseCardSnapshot(snapshot({ progress: [other] })).ok).toBe(false)
    expect(parseCardSnapshot(snapshot({ progress: [{ ...snapshot().progress[0], user_id: 3 }] })).ok).toBe(false)
    expect(parseCardSnapshot(snapshot(), CARD_ID).ok).toBe(false)
  })

  it('accepts a topic whose cards all belong to it', () => {
    const topic = { set: { id: SET_ID, title: 'La città', description: 'In the city', category: 'nouns', sort_order: 1, created_at: '2026-09-01T00:00:00Z' }, cards: [snapshot()] }
    expect(parseTopicSnapshot(topic).ok).toBe(true)
    expect(parseTopicSnapshot({ ...topic, set: { ...topic.set, id: CARD_ID } }).ok).toBe(false)
  })
})
