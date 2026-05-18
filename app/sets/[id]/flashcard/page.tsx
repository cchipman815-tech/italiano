import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import FlashcardStudy from '@/components/FlashcardStudy'
import AppNav from '@/components/AppNav'
import { FlashcardIcon } from '@/components/StudyIcons'
import { isValidUserId, getUserById } from '@/lib/users'
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

  const user = getUserById(userId)
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
      <>
        <AppNav userInitial={user.name[0]} />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-qz-secondary mb-4">This set has no cards yet.</p>
          <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">Add some cards</Link>
        </div>
      </>
    )
  }

  const initialProgress = Object.fromEntries(data.progress.map(p => [p.card_id, p.known]))

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <nav className="text-sm text-qz-secondary mb-4">
          <Link href="/home" className="hover:text-qz-text transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href={`/sets/${id}`} className="hover:text-qz-text transition-colors">{data.title}</Link>
          <span className="mx-1.5">›</span>
          <span>Flashcards</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-qz-blue"><FlashcardIcon size={24} /></span>
          <h1 className="text-2xl font-bold text-qz-text">Flashcards</h1>
          <span className="text-xs font-semibold text-qz-secondary bg-qz-subtle px-2.5 py-1 rounded-full">
            {direction === 'it-en' ? 'IT → EN' : 'EN → IT'}
          </span>
        </div>
        <FlashcardStudy setId={id} cards={data.cards} initialProgress={initialProgress} direction={direction} />
      </div>
    </>
  )
}
