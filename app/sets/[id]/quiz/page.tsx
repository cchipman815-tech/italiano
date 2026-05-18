import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import QuizStudy from '@/components/QuizStudy'
import { isValidUserId } from '@/lib/users'
import type { SetWithCards } from '@/lib/types'

export default async function QuizPage({
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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-4">Need at least 4 cards to use Quiz mode.</p>
        <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">
          Add more cards
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <nav className="text-sm text-qz-secondary mb-4">
        <Link href="/home" className="hover:text-qz-text transition-colors">Sets</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/sets/${id}`} className="hover:text-qz-text transition-colors">{data.title}</Link>
      </nav>
      <h1 className="text-2xl font-bold text-qz-text mb-4">Quiz</h1>
      <QuizStudy setId={id} cards={data.cards} />
    </div>
  )
}
