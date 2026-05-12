import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import FlashcardStudy from '@/components/FlashcardStudy'
import { isValidUserId } from '@/lib/users'
import type { SetWithCards } from '@/lib/types'

export default async function FlashcardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ direction?: string }>
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const { id } = await params
  const { direction: dirParam } = await searchParams
  const direction = dirParam === 'en-it' ? 'en-it' : 'it-en'

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) notFound()

  const data: SetWithCards = await res.json()

  if (data.cards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">This set has no cards yet.</p>
        <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">
          Add some cards
        </Link>
      </div>
    )
  }

  const initialProgress = Object.fromEntries(
    data.progress.map(p => [p.card_id, p.known])
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {data.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Flashcards</span>
      </div>
      <FlashcardStudy setId={id} cards={data.cards} initialProgress={initialProgress} direction={direction} />
    </div>
  )
}
