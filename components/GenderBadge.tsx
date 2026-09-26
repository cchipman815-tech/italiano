import { genderChip } from '@/lib/study'

interface Props {
  gender: 'm' | 'f' | null | undefined
  /** The noun's article; the chip reads "la · f". */
  article?: string | null
  className?: string
}

/** A neutral chip with a noun's article and gender, e.g. "la · f". Nothing for words without a gender. */
export default function GenderBadge({ gender, article, className }: Props) {
  const text = genderChip({ gender: gender ?? null, article: article ?? null })
  if (!text) return null
  return (
    <span className={['gch', className].filter(Boolean).join(' ')} lang="it" title={gender === 'f' ? 'femminile' : 'maschile'}>
      {text}
    </span>
  )
}
