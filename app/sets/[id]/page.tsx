import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { isValidUserId, getUserById } from '@/lib/users'
import { calculateProgress } from '@/lib/utils'
import { isDueToday } from '@/lib/srs'
import type { SetWithCards } from '@/lib/types'
import StudyModePicker from '@/components/StudyModePicker'
import AppNav from '@/components/AppNav'

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

  const user = getUserById(userId)
  const { id } = await params
  const set = await getSet(id, userId)
  if (!set) notFound()

  const totalCards = set.cards.length
  const knownCards = set.progress.filter(p => p.known).length
  const progress = calculateProgress(knownCards, totalCards)
  const canStudyMulti = totalCards >= 4
  const hasConjugations = set.cards.some(c => c.enabled !== false && c.conjugations?.present != null)

  const progressMap = Object.fromEntries(set.progress.map(p => [p.card_id, p]))
  const dueCount = set.cards.filter(card => {
    if (card.enabled === false) return false
    const p = progressMap[card.id]
    return isDueToday(p?.next_review_at ?? null)
  }).length

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-qz-secondary mb-6">
          <Link href="/home" className="hover:text-qz-text transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-qz-text font-medium">{set.title}</span>
        </nav>

        <h1 className="text-2xl font-bold text-qz-text mb-1">{set.title}</h1>
        {set.description && <p className="text-qz-secondary mb-3">{set.description}</p>}
        <div className="flex items-center gap-4 text-sm text-qz-secondary mb-3">
          <span>{totalCards} terms</span>
          <span>{progress}% known</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5 mb-5">
          <div className="bg-qz-blue h-1.5 rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <StudyModePicker setId={id} canStudyMulti={canStudyMulti} dueCount={dueCount} hasConjugations={hasConjugations} />
      </div>
    </>
  )
}
