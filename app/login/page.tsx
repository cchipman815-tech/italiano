import type { Metadata } from 'next'
import { USERS } from '@/lib/users'
import { loadOverview } from '@/lib/queries'
import WhoIsStudying from '@/components/WhoIsStudying'

export const metadata: Metadata = { title: 'Chi studia? — Italiano' }

/** Chi studia?: each person with what's due for them today. */
export default async function LoginPage() {
  const people = await Promise.all(USERS.map(async user => {
    // The picker still works if the numbers can't load.
    const due = await loadOverview(user.id).then(o => o.due, () => null)
    return { id: user.id, name: user.name, due }
  }))
  return <WhoIsStudying people={people} />
}
