import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { parseNewCard } from '@/lib/cards'

/**
 * Aggiungi carta: a card at the end of the topic. Italian and English are
 * required; article, gender, plural, word type, chapter, on/off and the six
 * present-tense forms are optional (see lib/cards.ts).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id: setId } = await params
  const parsed = parseNewCard(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const db = createServerClient()
  const { data: set } = await db.from('sets').select('id').eq('id', setId).maybeSingle()
  if (!set) return notFound()

  const { data: existing } = await db
    .from('cards')
    .select('sort_order')
    .eq('set_id', setId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = existing ? existing.sort_order + 1 : 0

  const { data, error } = await db
    .from('cards')
    .insert({ ...parsed.value, set_id: setId, sort_order: sortOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
