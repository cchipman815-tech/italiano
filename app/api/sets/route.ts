import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function GET() {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const db = createServerClient()

  const { data: sets } = await db
    .from('sets')
    .select('*')
    .order('sort_order', { ascending: true })

  if (!sets) return NextResponse.json([])

  const { data: cardCounts } = await db.from('cards').select('id, set_id')

  const { data: knownProgress } = await db
    .from('progress')
    .select('card_id, cards!inner(set_id)')
    .eq('user_id', userId)
    .eq('known', true)

  const result = sets.map(set => {
    const total = cardCounts?.filter(c => c.set_id === set.id).length ?? 0
    const known = (knownProgress as Array<{ card_id: string; cards: { set_id: string } }> | null)
      ?.filter(p => p.cards.set_id === set.id).length ?? 0
    return { ...set, total_cards: total, known_cards: known }
  })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json()
  const { title, description, category } = body

  const db = createServerClient()
  const { data, error } = await db
    .from('sets')
    .insert({ title, description: description ?? null, category: category ?? 'general' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
