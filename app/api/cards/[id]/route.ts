import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { parseConjugations } from '@/lib/cards'
import { snapshotCards } from '@/lib/snapshots'
import type { Card } from '@/lib/types'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const body = await request.json() as {
    italian?: string
    english?: string
    conjugations?: unknown
    enabled?: boolean
    plural?: string | null
    example?: { italian: string; english: string } | null
    word_type?: string | null
    article?: string | null
    chapter?: number | null
    adjective_forms?: { ms: string; fs: string; mp: string; fp: string } | null
    tense?: string | null
  }

  const update: Record<string, unknown> = {}
  if (body.italian          !== undefined) update.italian          = body.italian
  if (body.english          !== undefined) update.english          = body.english
  if (body.conjugations     !== undefined) {
    const conjugations = parseConjugations(body.conjugations)
    if (conjugations === undefined) return NextResponse.json({ error: 'Bad conjugations' }, { status: 400 })
    update.conjugations = conjugations
  }
  if (body.enabled          !== undefined) update.enabled          = body.enabled
  if (body.plural           !== undefined) update.plural           = body.plural
  if (body.example          !== undefined) update.example          = body.example
  if (body.word_type        !== undefined) update.word_type        = body.word_type
  if (body.article          !== undefined) update.article          = body.article
  if (body.chapter          !== undefined) update.chapter          = body.chapter
  if (body.adjective_forms  !== undefined) update.adjective_forms  = body.adjective_forms
  if (body.tense            !== undefined) update.tense            = body.tense

  const db = createServerClient()
  const { data, error } = await db
    .from('cards')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

/** Deletes a card; answers with a snapshot (both users' progress too) so Annulla can put it back. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()
  const { data: card } = await db.from('cards').select('*').eq('id', id).maybeSingle()
  if (!card) return notFound()
  try {
    const [snapshot] = await snapshotCards(db, [card as Card])
    const { error } = await db.from('cards').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(snapshot)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete' }, { status: 500 })
  }
}
