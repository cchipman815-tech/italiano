import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SetCard from '@/components/SetCard'
import AppNav from '@/components/AppNav'
import TranslatorWidget from '@/components/TranslatorWidget'
import { isValidUserId, getUserById } from '@/lib/users'
import type { SetWithProgress } from '@/lib/types'

async function getSets(userId: number): Promise<SetWithProgress[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const user = getUserById(userId)
  const sets = await getSets(userId)

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <TranslatorWidget />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sets.map(set => (
            <SetCard key={set.id} set={set} />
          ))}
          <Link
            href="/sets/new"
            className="bg-white rounded-2xl border-2 border-dashed border-qz-border p-5 flex flex-col items-center justify-center gap-2 text-qz-secondary hover:border-qz-blue hover:text-qz-blue transition-colors min-h-[160px] font-medium"
          >
            <span className="text-3xl">+</span>
            <span>New Set</span>
          </Link>
        </div>
      </div>
    </>
  )
}
