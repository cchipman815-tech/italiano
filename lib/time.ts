/**
 * Local-time wording for Oggi. The server runs in UTC, so the browser's
 * time zone travels in a `tz` cookie (set by the shell). The same zone sets
 * where SRS days turn over: getToday() in lib/api-helpers.ts.
 */
import type { Bilingual } from './paths'

export const TZ_COOKIE = 'tz'
const FALLBACK_TZ = 'UTC'

/** A valid IANA zone from the cookie, or UTC. */
export function parseTimeZone(raw: string | undefined): string {
  if (!raw) return FALLBACK_TZ
  try {
    new Intl.DateTimeFormat('en', { timeZone: raw })
    return raw
  } catch {
    return FALLBACK_TZ
  }
}

function hourIn(date: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(date))
}

/** Buongiorno until 1pm, Buon pomeriggio until 6pm, then Buonasera. */
export function greeting(date: Date, timeZone: string): Bilingual {
  const h = hourIn(date, timeZone)
  if (h >= 5 && h < 13) return { it: 'Buongiorno', en: 'Good morning' }
  if (h >= 13 && h < 18) return { it: 'Buon pomeriggio', en: 'Good afternoon' }
  return { it: 'Buonasera', en: 'Good evening' }
}

/** "giovedì 25 settembre" / "Thursday 25 September". */
export function formatDay(date: Date, timeZone: string): Bilingual {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', timeZone }
  return {
    it: new Intl.DateTimeFormat('it-IT', opts).format(date),
    en: new Intl.DateTimeFormat('en-GB', opts).format(date),
  }
}

/** When the next review is: "domani" for the day after `today`, otherwise the date. Dates are YYYY-MM-DD. */
export function nextReviewLabel(next: string, today: string): Bilingual {
  const tomorrow = new Date(`${today}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (next === tomorrow.toISOString().slice(0, 10)) return { it: 'domani', en: 'tomorrow' }
  return formatDay(new Date(`${next}T12:00:00Z`), 'UTC')
}
