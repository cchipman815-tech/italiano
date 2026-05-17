import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ConjugationStudy from '@/components/ConjugationStudy'
import { isValidUserId } from '@/lib/users'
import type { SetWithCards } from '@/lib/types'

export default async function ConjugationPage({
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
  const hasVerbCards = data.cards.some(c => c.conjugations?.present != null)

  if (!hasVerbCards) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">No conjugation data in this set.</p>
        <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">
          Enable more cards
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {data.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Conjugations</span>
      </div>
      <ConjugationStudy setId={id} cards={data.cards} direction={direction} />
    </div>
  )
}
