import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

/**
 * When Salvate undoes a delete it sends the row's original date, so the row
 * returns to its place. Anything missing, invalid or in the future means now.
 */
function restoredDate(raw: unknown): string {
  const now = Date.now()
  const at = typeof raw === 'string' ? Date.parse(raw) : NaN
  return new Date(Number.isFinite(at) && at <= now ? at : now).toISOString()
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json() as { english?: string; italian?: string; created_at?: string }
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
      { user_id: userId, english, italian, created_at: restoredDate(body.created_at) },
      { onConflict: 'user_id,english,italian' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
