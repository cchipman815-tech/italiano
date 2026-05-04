import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json()
  const { cardId, known } = body as { cardId: string; known: boolean }

  const db = createServerClient()
  const { error } = await db.from('progress').upsert(
    { user_id: userId, card_id: cardId, known, last_seen_at: new Date().toISOString() },
    { onConflict: 'user_id,card_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
