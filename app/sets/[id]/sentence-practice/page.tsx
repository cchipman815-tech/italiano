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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <nav className="text-sm text-qz-secondary mb-4">
        <Link href="/home" className="hover:text-qz-text transition-colors">Sets</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/sets/${id}`} className="hover:text-qz-text transition-colors">{setData.title}</Link>
      </nav>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-qz-text">Sentence Practice</h1>
        <span className="text-xs font-semibold text-qz-secondary bg-qz-subtle px-2.5 py-1 rounded-full">
          {direction === 'it-en' ? 'IT → EN' : 'EN → IT'}
        </span>
      </div>
      <SentencePractice setId={id} questions={questions} direction={direction} />
    </div>
  )
}
