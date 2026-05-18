import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ReviewStudy from '@/components/ReviewStudy'
import AppNav from '@/components/AppNav'
import { ReviewIcon } from '@/components/StudyIcons'
import { isValidUserId, getUserById } from '@/lib/users'
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

  const user = getUserById(userId)
  const { id } = await params
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) notFound()

  const data: SetWithCards = await res.json()

  const progressMap = Object.fromEntries(data.progress.map(p => [p.card_id, p]))
  const dueCards = data.cards.filter(card => {
    if (card.enabled === false) return false
    const p = progressMap[card.id]
    return isDueToday(p?.next_review_at ?? null)
  })

  if (dueCards.length === 0) {
    return (
      <>
        <AppNav userInitial={user.name[0]} />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-qz-text mb-2">All caught up!</h2>
          <p className="text-qz-secondary mb-6">No cards due for review today.</p>
          <Link href={`/sets/${id}`} className="text-qz-blue hover:underline font-medium">← Back to set</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <nav className="text-sm text-qz-secondary mb-4">
          <Link href="/home" className="hover:text-qz-text transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href={`/sets/${id}`} className="hover:text-qz-text transition-colors">{data.title}</Link>
          <span className="mx-1.5">›</span>
          <span>Review</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-qz-blue"><ReviewIcon size={24} /></span>
          <h1 className="text-2xl font-bold text-qz-text">Review Due Cards</h1>
        </div>
        <ReviewStudy setId={id} cards={dueCards} />
      </div>
    </>
  )
}
