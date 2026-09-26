import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'
import { parseTopicSnapshot } from '@/lib/cards'
import { restoreCards } from '@/lib/snapshots'

/** Annulla after deleting a topic: the snapshot DELETE /api/sets/[id] returned goes back as it was. */
export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const parsed = parseTopicSnapshot(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { set, cards } = parsed.value

  const db = createServerClient()
  const { error } = await db.from('sets').insert(set)
  if (error) {
    const status = error.code === '23505' ? 409 : 400
    return NextResponse.json({ error: error.message }, { status })
  }
  try {
    await restoreCards(db, cards)
  } catch (err) {
    // Half a topic is worse than none: take the set back out (its cards cascade).
    await db.from('sets').delete().eq('id', set.id)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to restore' }, { status: 500 })
  }
  return NextResponse.json(set, { status: 201 })
}
