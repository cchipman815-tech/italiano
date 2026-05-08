import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ReviewStudy from '@/components/ReviewStudy'
import { isValidUserId } from '@/lib/users'
import { isDueToday } from '@/lib/srs'
import type { SetWithCards } from '@/lib/types'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const { id } = await params
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) notFound()

  const data: SetWithCards = await res.json()

  // Build a map of card_id → progress
  const progressMap = Object.fromEntries(
    data.progress.map(p => [p.card_id, p])
  )

  // Cards due today (or never reviewed)
  const dueCards = data.cards.filter(card => {
    if (card.enabled === false) return false
    const p = progressMap[card.id]
    return isDueToday(p?.next_review_at ?? null)
  })

  if (dueCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-qz-text mb-2">All caught up!</h2>
        <p className="text-qz-secondary mb-6">No cards due for review today.</p>
        <Link
          href={`/sets/${id}`}
          className="text-qz-blue hover:underline font-medium"
        >
          ← Back to set
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {data.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Review</span>
      </div>
      <ReviewStudy setId={id} cards={dueCards} />
    </div>
  )
}
