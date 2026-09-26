/**
 * Server-only data loading for the tab screens and review. Uses the service
 * role client directly instead of calling our own API over HTTP.
 */
import 'server-only'
import { createServerClient } from './supabase'
import { buildOverview, type Overview, type RawCard, type RawFormProgress, type RawProgress, type RawSet } from './overview'
import { getPath, getPathByCategory } from './paths'
import { todayString } from './srs'
import type { Card, Pronoun, SavedTranslation } from './types'
import { reviewItems, type CardPlace, type ReviewItem } from './study'
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
  /** Due cards, then due conjugation forms (the page shuffles them together). */
  items: ReviewItem[]
  /** Path and topic of every set an item comes from, for the card's tag. */
  places: Record<string, CardPlace>
  /** What the deck covers, for the back button: a topic title, a path, or everything. */
  scope: { kind: 'set'; id: string; title: string } | { kind: 'path'; slug: string } | { kind: 'all' }
}

/**
 * Enabled cards due today or earlier (never-reviewed cards are new, not due),
 * plus conjugation forms due today whose verb is enabled, within a scope.
 * These are exactly what Oggi's due number counts.
 */
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

  const [dueCards, dueForms] = await Promise.all([
    db.from('progress')
      .select('card_id')
      .eq('user_id', userId)
      .not('next_review_at', 'is', null)
      .lte('next_review_at', today)
      .range(0, 9999),
    loadDueForms(userId, today),
  ])
  if (dueCards.error) throw dueCards.error
  const dueIds = new Set((dueCards.data ?? []).map(p => p.card_id as string))
  const ids = [...new Set([...dueIds, ...dueForms.map(f => f.card_id)])]
  if (ids.length === 0 || setIds?.length === 0) return { items: [], places: {}, scope: deckScope }

  let query = db.from('cards').select('*').in('id', ids)
  if (setIds) query = query.in('set_id', setIds)
  if (scope.cap != null) query = query.eq('chapter', scope.cap)
  const { data: cards, error: cardsError } = await query
  if (cardsError) throw cardsError

  const items = reviewItems((cards ?? []) as Card[], dueIds, dueForms)

  return { items, places: await loadPlaces([...new Set(items.map(i => i.card.set_id))]), scope: deckScope }
}

/** Conjugation forms due today or earlier. Empty if migration 010 hasn't run. */
async function loadDueForms(userId: number, today: string): Promise<{ card_id: string; pronoun: Pronoun }[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('conjugation_progress')
    .select('card_id, pronoun')
    .eq('user_id', userId)
    .not('next_review_at', 'is', null)
    .lte('next_review_at', today)
    .range(0, 9999)
  return error ? [] : ((data ?? []) as { card_id: string; pronoun: Pronoun }[])
}

async function loadPlaces(setIds: string[]): Promise<Record<string, CardPlace>> {
  if (setIds.length === 0) return {}
  const db = createServerClient()
  const { data, error } = await db.from('sets').select('id, title, category').in('id', setIds)
  if (error) throw error
  return Object.fromEntries((data ?? []).map(s => [s.id, placeOf(s)]))
}

function placeOf(set: { title: string; category: string }): CardPlace {
  return { path: getPathByCategory(set.category)?.name ?? null, topic: set.title }
}

export interface StudySet {
  id: string
  title: string
  category: string
  /** Enabled cards, in the topic's order. */
  cards: Card[]
  place: CardPlace
  /** Where a study screen's back button goes: the path page with this topic's sheet open. */
  back: { href: string; label: string }
}

/** A topic and its enabled cards, for a study mode. Null if the set doesn't exist. */
export async function loadStudySet(setId: string): Promise<StudySet | null> {
  const db = createServerClient()
  const [{ data: set }, { data: cards, error }] = await Promise.all([
    db.from('sets').select('id, title, category').eq('id', setId).maybeSingle(),
    db.from('cards').select('*').eq('set_id', setId).order('sort_order', { ascending: true }),
  ])
  if (!set) return null
  if (error) throw error
  const path = getPathByCategory(set.category)
  return {
    id: set.id,
    title: set.title,
    category: set.category,
    cards: ((cards ?? []) as Card[]).filter(c => c.enabled !== false),
    place: placeOf(set),
    back: { href: path ? `/learn/${path.slug}?topic=${set.id}` : `/sets/${set.id}`, label: set.title },
  }
}

/** Verb cards among `cardIds` with at least one form due today or earlier. */
export async function loadCardsWithDueForms(userId: number, cardIds: string[]): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set()
  const ids = new Set(cardIds)
  return new Set((await loadDueForms(userId, todayString())).map(f => f.card_id).filter(id => ids.has(id)))
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
