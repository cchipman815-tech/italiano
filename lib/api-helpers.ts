import { cookies } from 'next/headers'
import { isValidUserId, type UserId } from './users'
import { NextResponse } from 'next/server'

export async function getUserIdFromCookie(): Promise<UserId | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const id = raw ? parseInt(raw, 10) : null
  return id !== null && isValidUserId(id) ? id : null
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
