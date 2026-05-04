import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import MatchStudy from '@/components/MatchStudy'
import { isValidUserId } from '@/lib/users'
import type { SetWithCards } from '@/lib/types'

export default async function MatchPage({
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

  if (data.cards.length < 4) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Need at least 4 cards to use Match mode.</p>
        <Link href={`/sets/${id}/edit`} className="text-green-600 hover:underline">
          Add more cards
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {data.title}
        </Link>
        <span className="text-sm font-medium text-gray-700">Match</span>
      </div>
      <MatchStudy setId={id} cards={data.cards} />
    </div>
  )
}
