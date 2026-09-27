import { describe, it, expect } from 'vitest'
import { calculateNextReview, countDueAndNew, todayString } from '@/lib/srs'

const TODAY = '2026-09-25'
const card = (id: string, enabled = true) => ({ id, enabled })
const seen = (card_id: string, next_review_at: string | null) => ({ card_id, next_review_at })

describe('countDueAndNew', () => {
  it('counts never-reviewed cards as new, not due', () => {
    expect(countDueAndNew([card('a'), card('b')], [], [], TODAY)).toEqual({ due: 0, new: 2 })
  })

  it('counts cards due today or earlier, but not later', () => {
    const cards = [card('a'), card('b'), card('c')]
    const progress = [seen('a', '2026-09-24'), seen('b', TODAY), seen('c', '2026-09-26')]
    expect(countDueAndNew(cards, progress, [], TODAY)).toEqual({ due: 2, new: 0 })
  })

  it('treats a progress row without a review date as new', () => {
    expect(countDueAndNew([card('a')], [seen('a', null)], [], TODAY)).toEqual({ due: 0, new: 1 })
  })

  it('ignores disabled cards entirely', () => {
    const cards = [card('a', false), card('b', false)]
    expect(countDueAndNew(cards, [seen('a', '2026-09-01')], [], TODAY)).toEqual({ due: 0, new: 0 })
  })

  it('treats enabled: null as enabled, like the rest of the app', () => {
    expect(countDueAndNew([{ id: 'a', enabled: null }], [], [], TODAY)).toEqual({ due: 0, new: 1 })
  })

  it('adds conjugation forms that are due while their verb is enabled', () => {
    const cards = [card('essere'), card('avere', false)]
    const progress = [seen('essere', '2026-10-01')]
    const forms = [
      seen('essere', '2026-09-20'),
      seen('essere', TODAY),
      seen('essere', '2026-10-02'),
      seen('essere', null),
      seen('avere', '2026-09-20'),
    ]
    expect(countDueAndNew(cards, progress, forms, TODAY)).toEqual({ due: 2, new: 0 })
  })
})

describe('todayString', () => {
  it('is the date where the learner is, not in UTC', () => {
    // 18:30 in Los Angeles on the 26th is already the 27th in UTC.
    const evening = new Date('2026-09-27T01:30:00Z')
    expect(todayString('America/Los_Angeles', evening)).toBe('2026-09-26')
    expect(todayString('UTC', evening)).toBe('2026-09-27')
    // 00:30 in Rome on the 27th is still the 26th in UTC.
    expect(todayString('Europe/Rome', new Date('2026-09-26T22:30:00Z'))).toBe('2026-09-27')
  })

  it('falls back to UTC', () => {
    expect(todayString(undefined, new Date('2026-09-27T01:30:00Z'))).toBe('2026-09-27')
  })
})

describe('calculateNextReview', () => {
  const fresh = { interval: 1, ease_factor: 2.5, repetitions: 0, next_review_at: null }

  it('counts from the learner’s today', () => {
    expect(calculateNextReview(fresh, true, '2026-09-26').next_review_at).toBe('2026-09-27')
    expect(calculateNextReview(fresh, false, '2026-09-26').next_review_at).toBe('2026-09-27')
  })

  it('crosses month ends', () => {
    const third = { interval: 6, ease_factor: 2.5, repetitions: 2, next_review_at: '2026-09-30' }
    expect(calculateNextReview(third, true, '2026-09-30')).toMatchObject({ interval: 15, next_review_at: '2026-10-15' })
  })

  it('never makes a card answered today due again today', () => {
    for (const correct of [true, false]) {
      const next = calculateNextReview(fresh, correct, '2026-09-26').next_review_at!
      expect(countDueAndNew([{ id: 'a' }], [{ card_id: 'a', next_review_at: next }], [], '2026-09-26').due).toBe(0)
    }
  })
})
