import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SetCard from '@/components/SetCard'
import LargeTitle from '@/components/LargeTitle'
import NavLink from '@/components/NavLink'
import { isValidUserId } from '@/lib/users'
import { t } from '@/lib/i18n'
import type { SetWithProgress } from '@/lib/types'

async function getSets(userId: number): Promise<SetWithProgress[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sets`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

/** Impara. For now it lists every set; PR 4 replaces this with the four paths. */
export default async function LearnPage() {
  const cookieStore = await cookies()
  const userId = Number(cookieStore.get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')

  const sets = await getSets(userId)

  return (
    <>
      <LargeTitle title={t('learn')} />
      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sets.map(set => <SetCard key={set.id} set={set} />)}
        <NavLink
          href="/sets/new"
          className="bg-white rounded-2xl border-2 border-dashed border-qz-border p-5 flex flex-col items-center justify-center gap-2 text-qz-secondary hover:border-qz-blue hover:text-qz-blue transition-colors min-h-[160px] font-medium"
        >
          <span className="text-3xl">+</span>
          <span>New Set</span>
        </NavLink>
      </div>
    </>
  )
}
