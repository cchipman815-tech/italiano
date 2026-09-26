import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidUserId } from '@/lib/users'
import { loadSaved, loadTopicChoices } from '@/lib/queries'
import { TZ_COOKIE, parseTimeZone } from '@/lib/time'
import SavedView from '@/components/SavedView'

/** Salvate: the signed-in user's own saved translations. */
export default async function SavedPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  if (!userId || !isValidUserId(userId)) redirect('/login')

  const [items, topics] = await Promise.all([loadSaved(userId), loadTopicChoices()])
  return (
    <SavedView
      initial={items}
      topics={topics}
      now={new Date().toISOString()}
      timeZone={parseTimeZone(cookieStore.get(TZ_COOKIE)?.value)}
    />
  )
}
