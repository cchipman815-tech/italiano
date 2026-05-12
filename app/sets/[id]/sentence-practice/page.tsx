import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isValidUserId } from '@/lib/users'
import SentencePractice from '@/components/SentencePractice'
import type { SetWithCards } from '@/lib/types'
import type { SentencePracticeQuestion } from '@/app/api/sentences/generate/route'

export default async function SentencePracticePage({
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

  const [setRes, genRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets/${id}`, {
      headers: { Cookie: `userId=${userId}` },
      cache: 'no-store',
    }),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sentences/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `userId=${userId}` },
      body: JSON.stringify({ setId: id }),
      cache: 'no-store',
    }),
  ])

  if (!setRes.ok) notFound()
  const setData: SetWithCards = await setRes.json()

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({ error: 'Unknown error' }))
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-qz-secondary mb-2">Could not generate practice questions.</p>
        <p className="text-sm text-qz-muted mb-6">{err.error}</p>
        <Link href={`/sets/${id}`} className="text-qz-blue hover:underline">
          ← Back to set
        </Link>
      </div>
    )
  }

  const { questions }: { questions: SentencePracticeQuestion[] } = await genRes.json()

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/sets/${id}`} className="text-sm text-qz-secondary hover:text-qz-text transition-colors">
          ← {setData.title}
        </Link>
        <span className="text-sm font-medium text-qz-text">Sentence Practice</span>
      </div>
      <SentencePractice setId={id} questions={questions} direction={direction} />
    </div>
  )
}
