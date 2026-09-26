import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import ReviewStudy from '@/components/ReviewStudy'
import SubpageBar from '@/components/SubpageBar'
import NavLink from '@/components/NavLink'
import Bi from '@/components/Bi'
import { isValidUserId } from '@/lib/users'
import { loadReviewDeck, type ReviewDeck } from '@/lib/queries'
import { getPath, type Bilingual } from '@/lib/paths'
import { t } from '@/lib/i18n'
import { shuffleArray } from '@/lib/utils'

function backFor(scope: ReviewDeck['scope']): { href: string; label: Bilingual | string } {
  if (scope.kind === 'set') return { href: `/sets/${scope.id}`, label: scope.title }
  if (scope.kind === 'path') return { href: `/learn/${scope.slug}`, label: getPath(scope.slug)!.name }
  return { href: '/home', label: t('today') }
}

/** Ripasso: every enabled card due today, optionally within a topic (?set=), a path (?path=) or a chapter (?cap=). */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string; path?: string; cap?: string }>
}) {
  const cookieStore = await cookies()
  const userId = Number(cookieStore.get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')

  const { set, path, cap: capParam } = await searchParams
  const cap = capParam && /^\d{1,2}$/.test(capParam) ? Number(capParam) : undefined
  const deck = await loadReviewDeck(userId, { set, path, cap })
  if (!deck) notFound()

  const back = backFor(deck.scope)
  const backLabel = typeof back.label === 'string' ? back.label : back.label.it

  if (deck.cards.length === 0) {
    return (
      <>
        <SubpageBar back={back} />
        <div className="nm-empty">
          <h2 className="nm-x"><Bi k="nothingDue" /></h2>
          <NavLink href={back.href} nav="back" className="nm-out" style={{ minWidth: 200, marginTop: 8 }}>
            {typeof back.label === 'string' ? back.label : <Bi {...back.label} />}
          </NavLink>
        </div>
      </>
    )
  }

  return (
    <>
      <SubpageBar back={back} trailing={cap != null ? `cap. ${cap}` : undefined} />
      <div className="max-w-4xl mx-auto px-4">
        <ReviewStudy cards={shuffleArray(deck.cards)} backHref={back.href} backLabel={backLabel} />
      </div>
    </>
  )
}
