import ListeningStudy from '@/components/ListeningStudy'
import StudyGate from '@/components/StudyGate'
import { openStudySet } from '@/lib/study-page'
import { buildQuestions } from '@/lib/study'

export default async function ListeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { set, availability } = await openStudySet(params, 'listening')
  if (!availability.available) return <StudyGate setId={set.id} back={set.back} icon="ear" reason={availability.reason} />

  return <ListeningStudy questions={buildQuestions(set.cards, 20)} cards={set.cards} back={set.back} />
}
