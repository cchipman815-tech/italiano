import FlashcardStudy from '@/components/FlashcardStudy'
import StudyGate from '@/components/StudyGate'
import { openStudySet } from '@/lib/study-page'
import { parseDirection } from '@/lib/study'
import { shuffleArray } from '@/lib/utils'

export default async function FlashcardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const { set, availability } = await openStudySet(params, 'flashcard')
  if (!availability.available) return <StudyGate setId={set.id} back={set.back} icon="cards" reason={availability.reason} />
  const direction = parseDirection((await searchParams).direction)

  // Shuffled here, not in the client component, so server and client render the same deck.
  return <FlashcardStudy cards={shuffleArray(set.cards)} place={set.place} back={set.back} direction={direction} />
}
