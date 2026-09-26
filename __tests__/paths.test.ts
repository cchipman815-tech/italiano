import { describe, it, expect } from 'vitest'
import {
  PATHS,
  MODES,
  MIN_CARDS_FOR_CHOICE_MODES,
  getPath,
  getPathByCategory,
  getTopic,
  isPathSlug,
  isPathCategory,
  modeAvailability,
  modesForPath,
} from '@/lib/paths'

describe('PATHS', () => {
  it('covers the 4 path categories in order', () => {
    expect(PATHS.map(p => [p.slug, p.category])).toEqual([
      ['parole', 'nouns'],
      ['verbi', 'verbs'],
      ['descrivere', 'adjectives'],
      ['frasi', 'phrases'],
    ])
  })

  it('has 19 topics with unique slugs and titles', () => {
    const topics = PATHS.flatMap(p => p.topics)
    expect(topics).toHaveLength(19)
    expect(new Set(topics.map(t => t.slug)).size).toBe(19)
    expect(new Set(topics.map(t => t.title)).size).toBe(19)
  })

  it('orders each path’s modes as the plan specifies', () => {
    expect(getPath('parole')!.modes).toEqual(['flashcard', 'quiz', 'listening', 'match', 'sentences'])
    expect(getPath('verbi')!.modes).toEqual(['conjugations', 'flashcard', 'quiz', 'match', 'sentences'])
    expect(getPath('descrivere')!.modes).toEqual(['flashcard', 'quiz', 'match', 'sentences'])
    expect(getPath('frasi')!.modes).toEqual(['listening', 'sentences', 'flashcard', 'quiz'])
  })

  it('gives every path and topic an Italian and an English label', () => {
    for (const p of PATHS) {
      expect(p.name.it && p.name.en && p.blurb.it && p.blurb.en && p.reviewAll.it && p.reviewAll.en).toBeTruthy()
      for (const t of p.topics) expect(t.title && t.label && t.en).toBeTruthy()
    }
  })
})

describe('lookups', () => {
  it('finds paths by slug and category', () => {
    expect(getPath('verbi')!.category).toBe('verbs')
    expect(getPathByCategory('adjectives')!.slug).toBe('descrivere')
    expect(getPath('general')).toBeUndefined()
    expect(getPathByCategory('general')).toBeUndefined()
  })

  it('finds a topic with its path', () => {
    const found = getTopic('verbi-isc')!
    expect(found.path.slug).toBe('verbi')
    expect(found.topic.title).toBe('-ire con -isc-')
    expect(getTopic('nope')).toBeUndefined()
  })

  it('validates slugs and categories', () => {
    expect(isPathSlug('frasi')).toBe(true)
    expect(isPathSlug('phrases')).toBe(false)
    expect(isPathSlug(undefined)).toBe(false)
    expect(isPathCategory('phrases')).toBe(true)
    expect(isPathCategory('general')).toBe(false)
  })
})

describe('modeAvailability', () => {
  const counts = (activeCards: number, conjugableCards = 0) => ({ activeCards, conjugableCards })

  it.each(['quiz', 'listening', 'match'] as const)('gates %s below 4 active cards', mode => {
    expect(MODES[mode].minCards).toBe(MIN_CARDS_FOR_CHOICE_MODES)
    expect(modeAvailability(mode, counts(4))).toEqual({ available: true })
    expect(modeAvailability(mode, counts(3))).toEqual({
      available: false,
      reason: {
        it: 'Servono almeno 4 carte attive · ne hai 3',
        en: 'Needs at least 4 active cards · you have 3',
      },
    })
  })

  it.each(['flashcard', 'sentences'] as const)('allows %s with a single card', mode => {
    expect(modeAvailability(mode, counts(1))).toEqual({ available: true })
  })

  it('explains an empty topic instead of “you have 0”', () => {
    const result = modeAvailability('quiz', counts(0))
    expect(result).toEqual({ available: false, reason: { it: 'Nessuna carta attiva', en: 'No active cards' } })
    expect(modeAvailability('flashcard', counts(0)).available).toBe(false)
  })

  it('gates conjugations on verbs with forms, not on card count', () => {
    expect(modeAvailability('conjugations', counts(13, 0)).available).toBe(false)
    expect(modeAvailability('conjugations', counts(1, 1))).toEqual({ available: true })
  })
})

describe('modesForPath', () => {
  it('returns the path’s modes in order, each with its gate', () => {
    const modes = modesForPath('frasi', { activeCards: 3, conjugableCards: 0 })
    expect(modes.map(m => m.mode)).toEqual(['listening', 'sentences', 'flashcard', 'quiz'])
    expect(modes.map(m => m.availability.available)).toEqual([false, true, true, false])
    expect(modes[0].route).toBe('listening')
    expect(modes[1].route).toBe('sentence-practice')
  })

  it('disables Coniugazioni for a verb topic with no conjugations', () => {
    const modes = modesForPath('verbi', { activeCards: 13, conjugableCards: 0 })
    expect(modes[0].mode).toBe('conjugations')
    expect(modes[0].availability.available).toBe(false)
    expect(modes.slice(1).every(m => m.availability.available)).toBe(true)
  })
})
