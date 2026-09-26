import { describe, it, expect } from 'vitest'
import { formatDay, greeting, nextReviewLabel, parseTimeZone } from '@/lib/time'

describe('parseTimeZone', () => {
  it('accepts IANA zones and falls back to UTC', () => {
    expect(parseTimeZone('America/Chicago')).toBe('America/Chicago')
    expect(parseTimeZone('Not/AZone')).toBe('UTC')
    expect(parseTimeZone(undefined)).toBe('UTC')
  })
})

describe('greeting', () => {
  // 2026-09-26 in Chicago is UTC−5.
  const at = (utcHour: number) => new Date(Date.UTC(2026, 8, 26, utcHour))

  it('uses the local hour, not the server’s', () => {
    expect(greeting(at(14), 'America/Chicago').it).toBe('Buongiorno') // 9:00
    expect(greeting(at(20), 'America/Chicago').it).toBe('Buon pomeriggio') // 15:00
    expect(greeting(at(2), 'America/Chicago').it).toBe('Buonasera') // 21:00 the day before
    expect(greeting(at(2), 'UTC').it).toBe('Buonasera') // 2:00
  })
})

describe('formatDay', () => {
  it('writes the day in Italian and English', () => {
    expect(formatDay(new Date(Date.UTC(2026, 8, 24, 18)), 'America/Chicago')).toEqual({
      it: 'giovedì 24 settembre',
      en: 'Thursday 24 September',
    })
  })
})

describe('nextReviewLabel', () => {
  it('says tomorrow for the next day, the date otherwise', () => {
    expect(nextReviewLabel('2026-09-27', '2026-09-26')).toEqual({ it: 'domani', en: 'tomorrow' })
    expect(nextReviewLabel('2026-10-01', '2026-09-26')).toEqual({ it: 'giovedì 1 ottobre', en: 'Thursday 1 October' })
  })
})
