import { describe, it, expect, vi, beforeEach } from 'vitest'

const jar = vi.hoisted(() => ({ values: {} as Record<string, string> }))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name in jar.values ? { name, value: jar.values[name] } : undefined) }),
}))

const { getToday } = await import('@/lib/api-helpers')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T01:30:00Z')) // 18:30 on the 26th in Los Angeles
  jar.values = {}
})

describe('getToday', () => {
  it('uses the zone in the tz cookie', async () => {
    jar.values.tz = 'America/Los_Angeles' // Next hands cookie values over decoded
    expect(await getToday()).toBe('2026-09-26')
  })

  it('falls back to UTC without a cookie, or with a bad one', async () => {
    expect(await getToday()).toBe('2026-09-27')
    jar.values.tz = 'Not/AZone'
    expect(await getToday()).toBe('2026-09-27')
  })
})
