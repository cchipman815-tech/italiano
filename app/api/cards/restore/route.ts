import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { parseCardSnapshot } from '@/lib/cards'
import { restoreCards } from '@/lib/snapshots'

/** Annulla after deleting a card: the snapshot DELETE /api/cards/[id] returned goes back, progress and all. */
export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const parsed = parseCardSnapshot(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const db = createServerClient()
  const { data: set } = await db.from('sets').select('id').eq('id', parsed.value.card.set_id).maybeSingle()
  if (!set) return notFound()
  try {
    await restoreCards(db, [parsed.value])
  } catch (err) {
    const code = (err as { code?: string }).code
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to restore' }, { status: code === '23505' ? 409 : 500 })
  }
  return NextResponse.json(parsed.value.card, { status: 201 })
}
