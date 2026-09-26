import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { calculateNextReview, type SRSState } from '@/lib/srs'
import { isPronoun } from '@/lib/study'
import type { Conjugations } from '@/lib/types'

const TENSE = 'present'

/**
 * POST { cardId, pronoun, known } — one conjugation form answered in
 * Coniugazioni or Ripasso. Schedules the form's next review with the same
 * SM-2 rules as cards (lib/srs.ts) and upserts it into conjugation_progress.
 */
export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json().catch(() => null) as { cardId?: unknown; pronoun?: unknown; known?: unknown } | null
  const { cardId, pronoun, known } = body ?? {}
  if (typeof cardId !== 'string' || !cardId || !isPronoun(pronoun) || typeof known !== 'boolean') {
    return NextResponse.json({ error: 'Expected { cardId, pronoun, known }' }, { status: 400 })
  }

  const db = createServerClient()

  const { data: card } = await db.from('cards').select('conjugations').eq('id', cardId).maybeSingle()
  if (!card) return notFound()
  if (!(card.conjugations as Conjugations | null)?.present?.[pronoun]) {
    return NextResponse.json({ error: 'This verb has no such form' }, { status: 400 })
  }

  const { data: existing } = await db
    .from('conjugation_progress')
    .select('interval, ease_factor, repetitions, next_review_at')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .eq('tense', TENSE)
    .eq('pronoun', pronoun)
    .maybeSingle()

  const current: SRSState = existing ?? { interval: 1, ease_factor: 2.5, repetitions: 0, next_review_at: null }
  const next = calculateNextReview(current, known)

  const { error } = await db.from('conjugation_progress').upsert(
    {
      user_id: userId,
      card_id: cardId,
      tense: TENSE,
      pronoun,
      known,
      last_seen_at: new Date().toISOString(),
      ...next,
    },
    { onConflict: 'user_id,card_id,tense,pronoun' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
