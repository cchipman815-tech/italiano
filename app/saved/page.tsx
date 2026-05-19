import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isValidUserId, getUserById } from '@/lib/users'
import AppNav from '@/components/AppNav'
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

  const user = getUserById(userId)
  const items = await getSavedTranslations(userId)

  return (
    <>
      <AppNav userInitial={user.name[0]} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-qz-secondary mb-6">
          <Link href="/home" className="hover:text-qz-text transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-qz-text font-medium">Saved Translations</span>
        </nav>

        <h1 className="text-2xl font-bold text-qz-text mb-6">Saved Translations</h1>

        <SavedTranslationsList initialItems={items} />
      </div>
    </>
  )
}
