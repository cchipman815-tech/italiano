import { describe, it, expect } from 'vitest'
import { selectDistractors } from '@/lib/quiz'
import type { Card } from '@/lib/types'

const makeCard = (id: string, english: string): Card => ({
  id,
  set_id: 'set-1',
  italian: `italian-${id}`,
  english,
  sort_order: 0,
})

const cards: Card[] = [
  makeCard('1', 'cat'),
  makeCard('2', 'dog'),
  makeCard('3', 'bird'),
  makeCard('4', 'fish'),
  makeCard('5', 'horse'),
]

describe('selectDistractors', () => {
  it('returns exactly count distractors', () => {
    const result = selectDistractors(cards, cards[0], 3)
    expect(result).toHaveLength(3)
  })

  it('never includes the correct card', () => {
    for (let i = 0; i < 20; i++) {
      const result = selectDistractors(cards, cards[0], 3)
      expect(result.find(c => c.id === cards[0].id)).toBeUndefined()
    }
  })

  it('returns unique cards', () => {
    const result = selectDistractors(cards, cards[0], 3)
    const ids = result.map(c => c.id)
    expect(new Set(ids).size).toBe(3)
  })
})
