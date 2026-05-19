import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()
  const { error } = await db.from('saved_translations').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
