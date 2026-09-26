import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { snapshotTopic } from '@/lib/snapshots'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()

  const { data: set } = await db.from('sets').select('*').eq('id', id).single()
  if (!set) return notFound()

  const { data: cards } = await db
    .from('cards')
    .select('*')
    .eq('set_id', id)
    .order('sort_order', { ascending: true })

  const cardIds = (cards ?? []).map(c => c.id)
  const { data: progress } = cardIds.length
    ? await db.from('progress').select('card_id, known').eq('user_id', userId).in('card_id', cardIds)
    : { data: [] }

  return NextResponse.json({ ...set, cards: cards ?? [], progress: progress ?? [] })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const body = await request.json()
  const { title, description, category } = body

  const db = createServerClient()
  const { data, error } = await db
    .from('sets')
    .update({ title, description: description ?? null, category })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

/** Deletes a topic and its cards; answers with a snapshot so Annulla can put it all back. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()
  try {
    const snapshot = await snapshotTopic(db, id)
    if (!snapshot) return notFound()
    const { error } = await db.from('sets').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(snapshot)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete' }, { status: 500 })
  }
}
