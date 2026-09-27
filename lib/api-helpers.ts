import { cookies } from 'next/headers'
import { isValidUserId, type UserId } from './users'
import { NextResponse } from 'next/server'
import { TZ_COOKIE, parseTimeZone } from './time'
import { todayString } from './srs'

export async function getUserIdFromCookie(): Promise<UserId | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const id = raw ? parseInt(raw, 10) : null
  return id !== null && isValidUserId(id) ? id : null
}

/**
 * Today's date (YYYY-MM-DD) where the learner is: the zone comes from the
 * `tz` cookie the shell sets, and is UTC until it has. Due dates are counted
 * against this, so the day turns over at their midnight.
 */
export async function getToday(): Promise<string> {
  const cookieStore = await cookies()
  return todayString(parseTimeZone(cookieStore.get(TZ_COOKIE)?.value))
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
