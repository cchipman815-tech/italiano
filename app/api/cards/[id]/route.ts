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
  const body = await request.json()
  const { italian, english, conjugations, enabled, plural, example } = body

  const update: Record<string, unknown> = {}
  if (italian !== undefined) update.italian = italian
  if (english !== undefined) update.english = english
  if (conjugations !== undefined) update.conjugations = conjugations
  if (enabled !== undefined) update.enabled = enabled
  if (plural !== undefined) update.plural = plural
  if (example !== undefined) update.example = example

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
