import { describe, it, expect } from 'vitest'
import { parseCssTime } from '@/lib/motion'

describe('parseCssTime', () => {
  it('reads milliseconds and the minified seconds form', () => {
    expect(parseCssTime('250ms')).toBe(250)
    expect(parseCssTime('.25s')).toBe(250)
    expect(parseCssTime(' 0.4s ')).toBe(400)
    expect(parseCssTime('150ms')).toBe(150)
  })

  it('returns null for anything else', () => {
    expect(parseCssTime('')).toBeNull()
    expect(parseCssTime('fast')).toBeNull()
    expect(parseCssTime('250')).toBeNull()
  })
})
