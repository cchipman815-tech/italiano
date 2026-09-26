import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized, notFound } from '@/lib/api-helpers'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { id } = await params
  const db = createServerClient()
  const { data, error } = await db
    .from('saved_translations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return notFound()
  return new NextResponse(null, { status: 204 })
}
