import SentencePractice from '@/components/SentencePractice'
import StudyGate from '@/components/StudyGate'
import { openStudySet } from '@/lib/study-page'
import { parseDirection } from '@/lib/study'

/** The sentences load in the browser (components/SentencePractice.tsx), behind a skeleton. */
export default async function SentencePracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const { set, availability } = await openStudySet(params, 'sentences')
  if (!availability.available) return <StudyGate setId={set.id} back={set.back} icon="quote" reason={availability.reason} />
  const direction = parseDirection((await searchParams).direction)

  return <SentencePractice setId={set.id} back={set.back} direction={direction} />
}
