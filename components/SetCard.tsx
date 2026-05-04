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
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl mb-1">{emoji}</div>
          <h2 className="font-semibold text-gray-900">{set.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {set.total_cards} {set.total_cards === 1 ? 'term' : 'terms'}
          </p>
        </div>
        <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
          {progress}% known
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-2 mt-1">
        <Link
          href={`/sets/${set.id}`}
          className="flex-1 text-center py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Study
        </Link>
        <Link
          href={`/sets/${set.id}/edit`}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
