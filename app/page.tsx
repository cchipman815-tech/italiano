import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isValidUserId } from '@/lib/users'

export default async function RootPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null

  if (userId !== null && isValidUserId(userId)) {
    redirect('/home')
  }

  redirect('/login')
}
