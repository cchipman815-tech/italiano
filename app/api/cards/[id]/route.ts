import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

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
  if (body.conjugations     !== undefined) update.conjugations     = body.conjugations
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()
  const { error } = await db.from('cards').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
