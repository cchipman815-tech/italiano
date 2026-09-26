/**
 * Progress saves from the study modes. Each save is fire-and-forget, but
 * every one in flight is tracked, so "Torna a Oggi" can wait for them and
 * Oggi's due count is right when it loads.
 */
import type { Pronoun } from './types'

const pending = new Set<Promise<unknown>>()

function post(url: string, body: unknown): void {
  const request = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
  pending.add(request)
  void request.finally(() => pending.delete(request))
}

/** A card answered: known (Lo so / right answer) or not. */
export function saveProgress(cardId: string, known: boolean): void {
  post('/api/progress', { cardId, known })
}

/** One conjugation form answered. */
export function saveFormProgress(cardId: string, pronoun: Pronoun, known: boolean): void {
  post('/api/conjugation-progress', { cardId, pronoun, known })
}

/** Resolves when every save in flight has finished, or after `timeoutMs`. */
export async function flushSaves(timeoutMs = 3000): Promise<void> {
  if (pending.size === 0) return
  await Promise.race([
    Promise.allSettled([...pending]),
    new Promise(resolve => setTimeout(resolve, timeoutMs)),
  ])
}
