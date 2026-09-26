/** Present-tense forms of a verb card and which of them are studied. Pure; no imports beyond types. */
import type { Conjugations, Pronoun } from './types'

export const PRONOUNS: Pronoun[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']

/**
 * The present-tense forms a verb is studied in: those it has, minus the ones
 * switched off in Modifica argomento. In pronoun order.
 */
export function activeForms(conjugations: Pick<Conjugations, 'present' | 'off'> | null | undefined): Pronoun[] {
  const present = conjugations?.present
  if (!present) return []
  const off = new Set(conjugations.off ?? [])
  return PRONOUNS.filter(p => present[p]?.trim() && !off.has(p))
}
