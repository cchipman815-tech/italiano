import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { CARD_TEXT_MAX, cardFromSaved, normalizeSearch } from '@/lib/saved'

/**
 * Aggiungi a un argomento: create a card in a topic from one of the user's
 * saved translations. Body: { setId }. 409 with the existing card's id when
 * the topic already has that word.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const body = await request.json().catch(() => ({})) as { setId?: unknown }
  const setId = typeof body.setId === 'string' ? body.setId : ''
  if (!setId) return NextResponse.json({ error: 'Missing setId' }, { status: 400 })

  const db = createServerClient()
  const { data: saved, error: savedError } = await db
    .from('saved_translations')
    .select('english, italian')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (savedError) return NextResponse.json({ error: savedError.message }, { status: 500 })
  if (!saved) return notFound()

  if (!saved.italian.trim() || !saved.english.trim()) {
    return NextResponse.json({ error: 'Missing english or italian' }, { status: 400 })
  }
  if (saved.italian.length > CARD_TEXT_MAX || saved.english.length > CARD_TEXT_MAX) {
    return NextResponse.json({ error: 'Too long for a card' }, { status: 400 })
  }

  const { data: set, error: setError } = await db.from('sets').select('id, category').eq('id', setId).maybeSingle()
  if (setError) return NextResponse.json({ error: setError.message }, { status: 400 })
  if (!set) return notFound()

  const fields = cardFromSaved(saved, set.category)
  const { data: siblings, error: siblingsError } = await db
    .from('cards')
    .select('id, italian, sort_order')
    .eq('set_id', setId)
  if (siblingsError) return NextResponse.json({ error: siblingsError.message }, { status: 500 })

  const key = normalizeSearch(fields.italian)
  const existing = siblings.find(c => normalizeSearch(c.italian) === key)
  if (existing) return NextResponse.json({ error: 'Already in this topic', cardId: existing.id }, { status: 409 })

  const sortOrder = siblings.reduce((max, c) => Math.max(max, c.sort_order + 1), 0)
  const { data: card, error } = await db
    .from('cards')
    .insert({ set_id: setId, ...fields, sort_order: sortOrder, enabled: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(card, { status: 201 })
}
