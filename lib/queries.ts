/**
 * Server-only data loading for the tab screens and review. Uses the service
 * role client directly instead of calling our own API over HTTP.
 */
import 'server-only'
import { createServerClient } from './supabase'
import { buildOverview, type Overview, type RawCard, type RawFormProgress, type RawProgress, type RawSet } from './overview'
import { getPath, getPathByCategory } from './paths'
import { todayString } from './srs'
import type { Card, SavedTranslation } from './types'
import type { TopicChoice } from './saved'

const CARD_COLUMNS = 'id, set_id, italian, article, chapter, enabled, conjugations, sort_order'

/**
 * Due conjugation forms. Until migration 010 runs the table doesn't exist;
 * treat that as "no forms" rather than failing the whole screen.
 */
async function loadFormProgress(userId: number): Promise<RawFormProgress[]> {
  const db = createServerClient()
  const { data, error } = await db.from('conjugation_progress').select('card_id, next_review_at').eq('user_id', userId)
  return error ? [] : (data as RawFormProgress[])
}

export async function loadOverview(userId: number): Promise<Overview> {
  const db = createServerClient()
  const [sets, cards, progress, forms] = await Promise.all([
    db.from('sets').select('id, title, description, category, sort_order'),
    db.from('cards').select(CARD_COLUMNS).range(0, 9999),
    db.from('progress').select('card_id, known, next_review_at, last_seen_at').eq('user_id', userId).range(0, 9999),
    loadFormProgress(userId),
  ])
  for (const r of [sets, cards, progress]) if (r.error) throw r.error

  return buildOverview(
    sets.data as RawSet[],
    cards.data as RawCard[],
    progress.data as RawProgress[],
    forms,
    todayString(),
  )
}

export interface ReviewScope {
  set?: string
  path?: string
  cap?: number
}

export interface ReviewDeck {
  cards: Card[]
  /** What the deck covers, for the back button: a topic title, a path, or everything. */
  scope: { kind: 'set'; id: string; title: string } | { kind: 'path'; slug: string } | { kind: 'all' }
}

/** Enabled cards due today or earlier (never-reviewed cards are new, not due), within a scope. */
export async function loadReviewDeck(userId: number, scope: ReviewScope): Promise<ReviewDeck | null> {
  const db = createServerClient()
  const today = todayString()

  let setIds: string[] | null = null
  let deckScope: ReviewDeck['scope'] = { kind: 'all' }
  if (scope.set) {
    const { data: set } = await db.from('sets').select('id, title').eq('id', scope.set).maybeSingle()
    if (!set) return null
    setIds = [set.id]
    deckScope = { kind: 'set', id: set.id, title: set.title }
  } else if (scope.path) {
    const path = getPath(scope.path)
    if (!path) return null
    const { data: sets } = await db.from('sets').select('id').eq('category', path.category)
    setIds = (sets ?? []).map(s => s.id)
    deckScope = { kind: 'path', slug: path.slug }
  }

  const { data: due, error } = await db
    .from('progress')
    .select('card_id')
    .eq('user_id', userId)
    .not('next_review_at', 'is', null)
    .lte('next_review_at', today)
    .range(0, 9999)
  if (error) throw error
  const dueIds = (due ?? []).map(p => p.card_id)
  if (dueIds.length === 0 || setIds?.length === 0) return { cards: [], scope: deckScope }

  let query = db.from('cards').select('*').in('id', dueIds)
  if (setIds) query = query.in('set_id', setIds)
  if (scope.cap != null) query = query.eq('chapter', scope.cap)
  const { data: cards, error: cardsError } = await query
  if (cardsError) throw cardsError

  const enabled = ((cards ?? []) as Card[]).filter(c => c.enabled !== false)
  return { cards: enabled, scope: deckScope }
}

/** Where a set lives in the Notte structure: its path, if its category is one. */
export async function loadSetPath(setId: string) {
  const db = createServerClient()
  const { data } = await db.from('sets').select('category').eq('id', setId).maybeSingle()
  return data ? getPathByCategory(data.category) ?? null : null
}

/** The user's saved translations, newest first. */
export async function loadSaved(userId: number): Promise<SavedTranslation[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('saved_translations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as SavedTranslation[]
}

/** Every topic a saved translation can be added to, in path order. */
export async function loadTopicChoices(): Promise<TopicChoice[]> {
  const db = createServerClient()
  const { data, error } = await db.from('sets').select('id, title, category, sort_order').order('sort_order')
  if (error) throw error
  return (data ?? []).map(({ id, title, category }) => ({ id, title, category }))
}
