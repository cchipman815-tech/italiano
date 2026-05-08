import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'
import { calculateNextReview } from '@/lib/srs'
import type { SRSState } from '@/lib/srs'

export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json()
  const { cardId, known } = body as { cardId: string; known: boolean }

  const db = createServerClient()

  // Fetch existing progress to compute updated SRS state
  const { data: existing } = await db
    .from('progress')
    .select('interval, ease_factor, repetitions, next_review_at')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

  const currentState: SRSState = existing ?? {
    interval: 1,
    ease_factor: 2.5,
    repetitions: 0,
    next_review_at: null,
  }

  const nextState = calculateNextReview(currentState, known)

  const { error } = await db.from('progress').upsert(
    {
      user_id: userId,
      card_id: cardId,
      known,
      last_seen_at: new Date().toISOString(),
      ...nextState,
    },
    { onConflict: 'user_id,card_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
