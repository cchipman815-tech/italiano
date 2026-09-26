import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidUserId } from '@/lib/users'
import LargeTitle from '@/components/LargeTitle'
import { t } from '@/lib/i18n'
import SavedTranslationsList from '@/components/SavedTranslationsList'
import type { SavedTranslation } from '@/lib/types'

async function getSavedTranslations(userId: number): Promise<SavedTranslation[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/saved-translations`, {
    headers: { Cookie: `userId=${userId}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<SavedTranslation[]>
}

export default async function SavedPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')
  const items = await getSavedTranslations(userId)

  return (
    <>
      <LargeTitle title={t('saved')} />
      <div className="max-w-4xl mx-auto px-4 py-6">

        <SavedTranslationsList initialItems={items} />
      </div>
    </>
  )
}
