import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'
import { loadOverview } from '@/lib/queries'

/** Every set with the current user's numbers. due_cards excludes cards never reviewed; those are new_cards. */
export async function GET() {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  try {
    const { topics } = await loadOverview(userId)
    return NextResponse.json(topics.map(topic => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      category: topic.category,
      total_cards: topic.total,
      known_cards: topic.known,
      due_cards: topic.due,
      new_cards: topic.new,
    })))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load sets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const body = await request.json()
  const { title, description, category } = body

  const db = createServerClient()
  const { data, error } = await db
    .from('sets')
    .insert({ title, description: description ?? null, category: category ?? 'general' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
