import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function GET() {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const db = createServerClient()
  const { data, error } = await db
    .from('saved_translations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json() as { english?: string; italian?: string }
  const english = body.english?.trim()
  const italian = body.italian?.trim()

  if (!english || !italian) {
    return NextResponse.json({ error: 'Missing english or italian' }, { status: 400 })
  }
  if (english.length > 1000 || italian.length > 1000) {
    return NextResponse.json({ error: 'Text too long' }, { status: 400 })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('saved_translations')
    .upsert(
      { user_id: userId, english, italian, created_at: new Date().toISOString() },
      { onConflict: 'user_id,english,italian' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
