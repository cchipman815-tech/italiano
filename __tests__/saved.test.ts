import { describe, it, expect } from 'vitest'
import { cardFromSaved, groupByDay, joinArticle, matchesQuery, splitArticle } from '@/lib/saved'

describe('matchesQuery', () => {
  const item = { italian: 'Vorrei un caffè.', english: "I'd like a coffee." }

  it('searches both languages, ignoring case and accents', () => {
    expect(matchesQuery(item, 'CAFFE')).toBe(true)
    expect(matchesQuery(item, 'coffee')).toBe(true)
    expect(matchesQuery(item, 'tè')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesQuery(item, '  ')).toBe(true)
  })
})

describe('groupByDay', () => {
  // 2026-09-26 03:00 UTC is still the 25th in Chicago.
  const now = new Date('2026-09-26T03:00:00Z')
  const row = (id: string, created_at: string) => ({ id, created_at })
  const items = [
    row('a', '2026-09-26T01:00:00Z'), // 25th, 20:00 Chicago
    row('b', '2026-09-24T12:00:00Z'), // 24th
    row('c', '2026-09-20T12:00:00Z'), // 20th
    row('d', '2026-09-18T12:00:00Z'), // 18th: a week before
    row('e', '2026-08-02T12:00:00Z'),
  ]

  it('uses the local day for Oggi, Ieri and Questa settimana, then months', () => {
    const groups = groupByDay(items, now, 'America/Chicago')
    expect(groups.map(g => [g.label.it, g.items.map(i => i.id).join('')])).toEqual([
      ['Oggi', 'a'],
      ['Ieri', 'b'],
      ['Questa settimana', 'c'],
      ['Settembre 2026', 'd'],
      ['Agosto 2026', 'e'],
    ])
    expect(groups[4].label.en).toBe('August 2026')
  })

  it('moves the day boundary with the time zone', () => {
    expect(groupByDay(items, now, 'UTC')[0].items.map(i => i.id)).toEqual(['a'])
    expect(groupByDay([row('x', '2026-09-25T23:00:00Z')], now, 'UTC')[0].label.it).toBe('Ieri')
  })
})

describe('splitArticle and joinArticle', () => {
  it('splits spaced and elided articles', () => {
    expect(splitArticle('la stazione')).toEqual({ article: 'la', rest: 'stazione' })
    expect(splitArticle("l’università")).toEqual({ article: "l'", rest: 'università' })
    expect(splitArticle('Gli zaini')).toEqual({ article: 'gli', rest: 'zaini' })
    expect(splitArticle('stazione')).toEqual({ article: null, rest: 'stazione' })
    expect(splitArticle('Dove è il bagno?')).toEqual({ article: null, rest: 'Dove è il bagno?' })
  })

  it('adds an article once', () => {
    expect(joinArticle('stazione', 'la')).toBe('la stazione')
    expect(joinArticle('università', "l'")).toBe("l'università")
    expect(joinArticle('la stazione', 'la')).toBe('la stazione')
    expect(joinArticle('ciao', null)).toBe('ciao')
  })
})

describe('cardFromSaved', () => {
  it('stores a noun’s article and gender separately in Parole', () => {
    expect(cardFromSaved({ italian: 'la stazione', english: 'the station' }, 'nouns')).toEqual({
      italian: 'stazione', english: 'the station', article: 'la', gender: 'f', word_type: 'noun',
    })
    expect(cardFromSaved({ italian: "l'ospedale", english: 'hospital' }, 'nouns')).toMatchObject({
      italian: 'ospedale', article: "l'", gender: null,
    })
  })

  it('keeps the whole text elsewhere and types the card by path', () => {
    expect(cardFromSaved({ italian: ' La cena è pronta. ', english: 'Dinner is ready.' }, 'phrases')).toEqual({
      italian: 'La cena è pronta.', english: 'Dinner is ready.', article: null, gender: null, word_type: 'phrase',
    })
    expect(cardFromSaved({ italian: 'parlare', english: 'to speak' }, 'verbs').word_type).toBe('verb')
    expect(cardFromSaved({ italian: 'ciao', english: 'hi' }, 'general').word_type).toBeNull()
  })
})
