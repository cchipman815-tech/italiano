/**
 * Server-only: take a snapshot of cards (with both users' progress) before a
 * delete, and put a snapshot back when the undo bar's Annulla is tapped.
 */
import 'server-only'
import { createServerClient } from './supabase'
import type { CardSnapshot, FormProgressRow, ProgressRow, TopicSnapshot } from './cards'
import type { Card, Set } from './types'

type Db = ReturnType<typeof createServerClient>

const PROGRESS_COLUMNS = 'user_id, card_id, known, last_seen_at, interval, ease_factor, repetitions, next_review_at'

export async function snapshotCards(db: Db, cards: Card[]): Promise<CardSnapshot[]> {
  if (cards.length === 0) return []
  const ids = cards.map(c => c.id)
  const [progress, forms] = await Promise.all([
    db.from('progress').select(PROGRESS_COLUMNS).in('card_id', ids).range(0, 9999),
    db.from('conjugation_progress').select(`${PROGRESS_COLUMNS}, tense, pronoun`).in('card_id', ids).range(0, 9999),
  ])
  if (progress.error) throw progress.error
  // conjugation_progress may not exist on an old database; a delete shouldn't fail for it.
  const formRows = (forms.error ? [] : forms.data) as FormProgressRow[]
  const progressRows = progress.data as ProgressRow[]
  return cards.map(card => ({
    card,
    progress: progressRows.filter(p => p.card_id === card.id),
    conjugationProgress: formRows.filter(p => p.card_id === card.id),
  }))
}

/** Loads a topic and everything under it, or null if it's gone. */
export async function snapshotTopic(db: Db, setId: string): Promise<TopicSnapshot | null> {
  const { data: set, error } = await db.from('sets').select('*').eq('id', setId).maybeSingle()
  if (error) throw error
  if (!set) return null
  const { data: cards, error: cardsError } = await db.from('cards').select('*').eq('set_id', setId).range(0, 9999)
  if (cardsError) throw cardsError
  return { set: set as Set, cards: await snapshotCards(db, (cards ?? []) as Card[]) }
}

/** Puts cards back with their original ids, then their progress. */
export async function restoreCards(db: Db, snapshots: CardSnapshot[]): Promise<void> {
  if (snapshots.length === 0) return
  const { error } = await db.from('cards').insert(snapshots.map(s => s.card))
  if (error) throw error
  const progress = snapshots.flatMap(s => s.progress)
  const forms = snapshots.flatMap(s => s.conjugationProgress)
  if (progress.length) {
    const r = await db.from('progress').upsert(progress, { onConflict: 'user_id,card_id' })
    if (r.error) throw r.error
  }
  if (forms.length) {
    const r = await db.from('conjugation_progress').upsert(forms, { onConflict: 'user_id,card_id,tense,pronoun' })
    if (r.error) throw r.error
  }
}
