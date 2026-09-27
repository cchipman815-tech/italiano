import { describe, it, expect } from 'vitest'
import { shuffleArray } from '@/lib/utils'

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

