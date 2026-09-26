/**
 * Shared setup for the study routes under /sets/[id]/: the signed-in user,
 * the topic with its enabled cards, and whether this mode can start.
 */
import 'server-only'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { isValidUserId, type UserId } from './users'
import { loadStudySet, type StudySet } from './queries'
import { modeAvailability, type ModeAvailability, type StudyMode } from './paths'

export async function openStudySet(
  params: Promise<{ id: string }>,
  mode: StudyMode,
): Promise<{ userId: UserId; set: StudySet; availability: ModeAvailability }> {
  const userId = Number((await cookies()).get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')
  const { id } = await params
  const set = await loadStudySet(id)
  if (!set) notFound()
  const availability = modeAvailability(mode, {
    activeCards: set.cards.length,
    conjugableCards: set.cards.filter(c => c.conjugations?.present != null).length,
  })
  return { userId, set, availability }
}
