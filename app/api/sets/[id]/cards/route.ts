import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id: setId } = await params
  const body = await request.json()
  const { italian, english } = body

  const db = createServerClient()

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
    .insert({ set_id: setId, italian, english, sort_order: sortOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
