import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { isValidUserId } from '@/lib/users'
import { calculateProgress } from '@/lib/utils'
import { isDueToday } from '@/lib/srs'
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

  // SRS: count cards due today
  const progressMap = Object.fromEntries(set.progress.map(p => [p.card_id, p]))
  const dueCount = set.cards.filter(card => {
    if (card.enabled === false) return false
    const p = progressMap[card.id]
    return isDueToday(p?.next_review_at ?? null)
  }).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/home" className="text-sm text-qz-secondary hover:text-qz-text mb-6 inline-flex items-center gap-1 transition-colors">
        ← Back to sets
      </Link>

      <div className="bg-white rounded-2xl border-2 border-qz-border p-6 mb-6" style={{ boxShadow: 'var(--qz-shadow-card)' }}>
        <h1 className="text-2xl font-bold text-qz-text mb-1">{set.title}</h1>
        {set.description && <p className="text-qz-secondary mb-4">{set.description}</p>}
        <div className="flex items-center gap-4 text-sm text-qz-secondary">
          <span>{totalCards} terms</span>
          <span>{progress}% known</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5 mt-3">
          <div className="bg-qz-blue h-1.5 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`/sets/${id}/flashcard`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🃏</span>
          <div>
            <div className="font-semibold text-qz-text">Flashcards</div>
            <div className="text-sm text-qz-secondary">Flip cards, mark what you know</div>
          </div>
        </Link>

        {canStudyMulti ? (
          <Link
            href={`/sets/${id}/quiz`}
            className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
            style={{ boxShadow: 'var(--qz-shadow-sm)' }}
          >
            <span className="text-3xl">📝</span>
            <div>
              <div className="font-semibold text-qz-text">Quiz</div>
              <div className="text-sm text-qz-secondary">Multiple choice questions</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
            <span className="text-3xl">📝</span>
            <div>
              <div className="font-semibold text-qz-secondary">Quiz</div>
              <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
            </div>
          </div>
        )}

        {canStudyMulti ? (
          <Link
            href={`/sets/${id}/match`}
            className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
            style={{ boxShadow: 'var(--qz-shadow-sm)' }}
          >
            <span className="text-3xl">🎯</span>
            <div>
              <div className="font-semibold text-qz-text">Match</div>
              <div className="text-sm text-qz-secondary">Click to pair Italian with English</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
            <span className="text-3xl">🎯</span>
            <div>
              <div className="font-semibold text-qz-secondary">Match</div>
              <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
            </div>
          </div>
        )}

        {canStudyMulti ? (
          <Link
            href={`/sets/${id}/listening`}
            className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
            style={{ boxShadow: 'var(--qz-shadow-sm)' }}
          >
            <span className="text-3xl">🎧</span>
            <div>
              <div className="font-semibold text-qz-text">Listening</div>
              <div className="text-sm text-qz-secondary">Hear Italian, pick the meaning</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
            <span className="text-3xl">🎧</span>
            <div>
              <div className="font-semibold text-qz-secondary">Listening</div>
              <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
            </div>
          </div>
        )}

        <Link
          href={`/sets/${id}/review`}
          className="flex items-center gap-4 bg-white border-2 border-qz-blue rounded-2xl p-5 hover:bg-qz-blue-light transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🔁</span>
          <div className="flex-1">
            <div className="font-semibold text-qz-blue">Review Due Cards</div>
            <div className="text-sm text-qz-secondary">Spaced repetition — study what matters</div>
          </div>
          {dueCount > 0 && (
            <span className="bg-qz-blue text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {dueCount} due
            </span>
          )}
        </Link>

        <Link
          href={`/sets/${id}/edit`}
          className="text-center py-3 text-sm font-medium text-qz-secondary border-2 border-qz-border rounded-2xl hover:border-qz-blue hover:text-qz-blue transition-colors"
        >
          Edit this set
        </Link>
      </div>
    </div>
  )
}
