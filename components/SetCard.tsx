import Link from 'next/link'
import type { SetWithProgress } from '@/lib/types'
import { calculateProgress } from '@/lib/utils'

interface Props {
  set: SetWithProgress
}

const CATEGORY_EMOJI: Record<string, string> = {
  alphabet: '🔤',
  numbers: '🔢',
  verbs: '🏃',
  nouns: '📦',
  phrases: '💬',
  adjectives: '🎨',
  time: '📅',
  general: '📚',
}

export default function SetCard({ set }: Props) {
  const progress = calculateProgress(set.known_cards, set.total_cards)
  const emoji = CATEGORY_EMOJI[set.category] ?? '📚'

  return (
    <div className="bg-white rounded-2xl border-2 border-qz-border p-5 flex flex-col gap-3 hover:border-qz-blue transition-colors cursor-default"
      style={{ boxShadow: 'var(--qz-shadow-card)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl mb-1">{emoji}</div>
          <h2 className="font-semibold text-qz-text">{set.title}</h2>
          <p className="text-sm text-qz-secondary mt-0.5">
            {set.total_cards} {set.total_cards === 1 ? 'term' : 'terms'}
          </p>
        </div>
        <span className="text-sm font-semibold text-qz-blue bg-qz-blue-light px-2.5 py-1 rounded-full">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-qz-subtle rounded-full h-1.5">
        <div
          className="bg-qz-blue h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-2 mt-1">
        <Link
          href={`/sets/${set.id}`}
          className="flex-1 text-center py-2 bg-qz-blue text-white text-sm font-semibold rounded-full hover:bg-qz-blue-dark transition-colors"
        >
          Study
        </Link>
        <Link
          href={`/sets/${set.id}/edit`}
          className="px-4 py-2 text-sm font-medium text-qz-secondary border-2 border-qz-border rounded-full hover:border-qz-blue hover:text-qz-blue transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
