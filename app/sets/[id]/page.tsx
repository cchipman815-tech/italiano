import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { isValidUserId } from '@/lib/users'
import { calculateProgress } from '@/lib/utils'
import type { SetWithCards } from '@/lib/types'

async function getSet(id: string, userId: number) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<SetWithCards>
}

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const { id } = await params
  const set = await getSet(id, userId)
  if (!set) notFound()

  const totalCards = set.cards.length
  const knownCards = set.progress.filter(p => p.known).length
  const progress = calculateProgress(knownCards, totalCards)
  const canStudyMulti = totalCards >= 4

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/home" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
        ← Back to sets
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{set.title}</h1>
        {set.description && <p className="text-gray-500 mb-4">{set.description}</p>}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{totalCards} terms</span>
          <span>{progress}% known</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`/sets/${id}/flashcard`}
          className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <span className="text-3xl">🃏</span>
          <div>
            <div className="font-semibold text-gray-900">Flashcards</div>
            <div className="text-sm text-gray-500">Flip cards, mark what you know</div>
          </div>
        </Link>

        {canStudyMulti ? (
          <Link
            href={`/sets/${id}/quiz`}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">📝</span>
            <div>
              <div className="font-semibold text-gray-900">Quiz</div>
              <div className="text-sm text-gray-500">Multiple choice questions</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-5 opacity-50 cursor-not-allowed">
            <span className="text-3xl">📝</span>
            <div>
              <div className="font-semibold text-gray-500">Quiz</div>
              <div className="text-sm text-gray-400">Need at least 4 cards to enable</div>
            </div>
          </div>
        )}

        {canStudyMulti ? (
          <Link
            href={`/sets/${id}/match`}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">🎯</span>
            <div>
              <div className="font-semibold text-gray-900">Match</div>
              <div className="text-sm text-gray-500">Click to pair Italian with English</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-5 opacity-50 cursor-not-allowed">
            <span className="text-3xl">🎯</span>
            <div>
              <div className="font-semibold text-gray-500">Match</div>
              <div className="text-sm text-gray-400">Need at least 4 cards to enable</div>
            </div>
          </div>
        )}

        <Link
          href={`/sets/${id}/edit`}
          className="text-center py-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Edit this set
        </Link>
      </div>
    </div>
  )
}
