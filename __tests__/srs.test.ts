import { describe, it, expect } from 'vitest'
import { countDueAndNew } from '@/lib/srs'

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
