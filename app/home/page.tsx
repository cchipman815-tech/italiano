import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SetCard from '@/components/SetCard'
import LargeTitle from '@/components/LargeTitle'
import { t } from '@/lib/i18n'
import TranslatorWidget from '@/components/TranslatorWidget'
import SavedTranslationsCard from '@/components/SavedTranslationsCard'
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

async function getSavedCount(userId: number): Promise<number> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/saved-translations`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return 0
  const data = await res.json() as Array<unknown>
  return data.length
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const user = getUserById(userId)
  const [sets, savedCount] = await Promise.all([getSets(userId), getSavedCount(userId)])

  return (
    <>
      <LargeTitle title={t('today')} sub={<span>{user.name}</span>} />
      <div className="max-w-4xl mx-auto px-4 py-6">
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
          <SavedTranslationsCard count={savedCount} />
        </div>
      </div>
    </>
  )
}
