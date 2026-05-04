import type { Card } from './types'
import { shuffleArray } from './utils'

export function selectDistractors(allCards: Card[], correctCard: Card, count: number): Card[] {
  const pool = allCards.filter(c => c.id !== correctCard.id)
  return shuffleArray(pool).slice(0, count)
}
