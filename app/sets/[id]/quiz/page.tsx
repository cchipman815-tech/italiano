import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import QuizStudy from '@/components/QuizStudy'
import AppNav from '@/components/AppNav'
import { QuizIcon } from '@/components/StudyIcons'
import { isValidUserId, getUserById } from '@/lib/users'
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

  const user = getUserById(userId)
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
        <AppNav userInitial={user.name[0]} />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-qz-secondary mb-4">Need at least 4 cards to use Quiz mode.</p>
          <Link href={`/sets/${id}/edit`} className="text-qz-blue hover:underline">Add more cards</Link>
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
          <span>Quiz</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-qz-blue"><QuizIcon size={24} /></span>
          <h1 className="text-2xl font-bold text-qz-text">Quiz</h1>
        </div>
        <QuizStudy setId={id} cards={data.cards} />
      </div>
    </>
  )
}
