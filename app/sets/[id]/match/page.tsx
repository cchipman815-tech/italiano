import MatchStudy from '@/components/MatchStudy'
import StudyGate from '@/components/StudyGate'
import { openStudySet } from '@/lib/study-page'
import { buildMatchRounds } from '@/lib/study'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { set, availability } = await openStudySet(params, 'match')
  if (!availability.available) return <StudyGate setId={set.id} back={set.back} icon="grid" reason={availability.reason} />

  return <MatchStudy rounds={buildMatchRounds(set.cards)} cards={set.cards} setId={set.id} back={set.back} />
}
