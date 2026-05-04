import { describe, it, expect } from 'vitest'
import { shuffleArray, calculateProgress } from '@/lib/utils'

describe('shuffleArray', () => {
  it('returns an array with the same elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffleArray(arr)
    expect(result).toHaveLength(arr.length)
    expect([...result].sort()).toEqual([...arr].sort())
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    const copy = [...arr]
    shuffleArray(arr)
    expect(arr).toEqual(copy)
  })
})

describe('calculateProgress', () => {
  it('returns 0 when no cards are known', () => {
    expect(calculateProgress(0, 10)).toBe(0)
  })

  it('returns 100 when all cards are known', () => {
    expect(calculateProgress(10, 10)).toBe(100)
  })

  it('returns 0 when totalCards is 0', () => {
    expect(calculateProgress(0, 0)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    expect(calculateProgress(1, 3)).toBe(33)
  })
})
