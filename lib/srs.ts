/**
 * Simplified SM-2 spaced repetition algorithm.
 *
 * Given the current SRS state for a card and whether the answer was correct,
 * returns the updated state including the next review date.
 */
export interface SRSState {
  interval: number      // days until next review
  ease_factor: number   // multiplier (1.3 – 2.5+), starts at 2.5
  repetitions: number   // successful review streak
  next_review_at: string | null  // ISO date string YYYY-MM-DD
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.round(days))
  return toDateString(d)
}

export function calculateNextReview(state: SRSState, correct: boolean): SRSState {
  if (!correct) {
    // Incorrect: reset streak, schedule for tomorrow, reduce ease
    return {
      interval: 1,
      ease_factor: Math.max(1.3, state.ease_factor - 0.2),
      repetitions: 0,
      next_review_at: addDays(1),
    }
  }

  // Correct
  let newInterval: number
  const newRepetitions = state.repetitions + 1

  if (state.repetitions === 0) {
    newInterval = 1
  } else if (state.repetitions === 1) {
    newInterval = 6
  } else {
    newInterval = Math.round(state.interval * state.ease_factor)
  }

  const newEaseFactor = Math.min(2.5 + 0.1, Math.max(1.3, state.ease_factor + 0.1))

  return {
    interval: newInterval,
    ease_factor: newEaseFactor,
    repetitions: newRepetitions,
    next_review_at: addDays(newInterval),
  }
}

export function todayString(): string {
  return toDateString(new Date())
}

export function isDueToday(next_review_at: string | null): boolean {
  if (!next_review_at) return true  // never reviewed → always due
  const today = todayString()
  return next_review_at <= today
}

export interface DueNewCounts {
  /** Reviewed before and due today or earlier: cards plus conjugation forms. */
  due: number
  /** Enabled cards never reviewed. */
  new: number
}

/**
 * Oggi's two numbers. Unlike isDueToday(), a card that was never reviewed
 * is new, not due. Disabled cards count as neither, and a conjugation form
 * counts only while its verb card is enabled.
 */
export function countDueAndNew(
  cards: { id: string; enabled?: boolean | null }[],
  progress: { card_id: string; next_review_at: string | null }[],
  conjugationProgress: { card_id: string; next_review_at: string | null }[] = [],
  today: string = todayString(),
): DueNewCounts {
  const enabled = new Set(cards.filter(c => c.enabled !== false).map(c => c.id))
  const reviewedOn = new Map(progress.map(p => [p.card_id, p.next_review_at]))
  const isDue = (next: string | null | undefined) => next != null && next <= today

  let due = 0
  let fresh = 0
  for (const id of enabled) {
    const next = reviewedOn.get(id)
    if (next == null) fresh++
    else if (isDue(next)) due++
  }
  for (const form of conjugationProgress) {
    if (enabled.has(form.card_id) && isDue(form.next_review_at)) due++
  }
  return { due, new: fresh }
}
