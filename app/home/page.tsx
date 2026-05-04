import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SetCard from '@/components/SetCard'
import SignOutButton from '@/components/SignOutButton'
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🇮🇹</span>
          <h1 className="text-2xl font-bold text-gray-900">Italiano</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">{user.name}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sets.map(set => (
          <SetCard key={set.id} set={set} />
        ))}
        <Link
          href="/sets/new"
          className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors min-h-[160px]"
        >
          <span className="text-3xl">+</span>
          <span className="font-medium">New Set</span>
        </Link>
      </div>
    </div>
  )
}
