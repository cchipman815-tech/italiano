import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'
import { snapshotTopic } from '@/lib/snapshots'

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
