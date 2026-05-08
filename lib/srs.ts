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

export function isDueToday(next_review_at: string | null): boolean {
  if (!next_review_at) return true  // never reviewed → always due
  const today = toDateString(new Date())
  return next_review_at <= today
}
