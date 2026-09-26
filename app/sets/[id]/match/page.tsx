import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import SubpageBar from '@/components/SubpageBar'
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
      <>
        <SubpageBar back={{ href: `/sets/${id}`, label: data.title }} />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-qz-secondary mb-4">Need at least 4 cards to use Match mode.</p>
          <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">
            Add more cards
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <SubpageBar back={{ href: `/sets/${id}`, label: data.title }} trailing={<span lang="it">Abbina</span>} />
      <div className="max-w-xl mx-auto px-4 py-6">
        <MatchStudy setId={id} cards={data.cards} />
      </div>
    </>
  )
}
