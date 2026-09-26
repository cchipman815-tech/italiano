import QuizStudy from '@/components/QuizStudy'
import StudyGate from '@/components/StudyGate'
import { openStudySet } from '@/lib/study-page'
import { buildQuestions, parseDirection } from '@/lib/study'

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const { set, availability } = await openStudySet(params, 'quiz')
  if (!availability.available) return <StudyGate setId={set.id} back={set.back} icon="quiz" reason={availability.reason} />
  const direction = parseDirection((await searchParams).direction)

  return <QuizStudy questions={buildQuestions(set.cards, 20)} cards={set.cards} back={set.back} direction={direction} />
}
