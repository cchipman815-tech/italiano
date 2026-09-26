import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ImparaView from '@/components/ImparaView'
import { isValidUserId } from '@/lib/users'
import { loadOverview } from '@/lib/queries'

export default async function ImparaPage() {
  const cookieStore = await cookies()
  const userId = Number(cookieStore.get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')

  const overview = await loadOverview(userId)
  const paths = overview.paths.map(p => ({ slug: p.slug, active: p.active, due: p.due, chapters: p.chapters }))
  const chapters = [...new Set(paths.flatMap(p => Object.keys(p.chapters).map(Number)))].sort((a, b) => a - b)

  return <ImparaView paths={paths} chapters={chapters} />
}
