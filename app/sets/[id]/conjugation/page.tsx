import ConjugationStudy from '@/components/ConjugationStudy'
import StudyGate from '@/components/StudyGate'
import { openStudySet } from '@/lib/study-page'
import { loadCardsWithDueForms } from '@/lib/queries'
import { buildConjugationDeck, parseDirection } from '@/lib/study'

export default async function ConjugationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const { userId, set, availability } = await openStudySet(params, 'conjugations')
  if (!availability.available) return <StudyGate setId={set.id} back={set.back} icon="verb" reason={availability.reason} />
  const direction = parseDirection((await searchParams).direction)
  const due = await loadCardsWithDueForms(userId, set.cards.map(c => c.id))

  return (
    <ConjugationStudy
      deck={buildConjugationDeck(set.cards, due)}
      cards={set.cards}
      place={set.place}
      back={set.back}
      direction={direction}
    />
  )
}
