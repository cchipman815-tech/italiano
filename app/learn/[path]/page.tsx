import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import SubpageBar from '@/components/SubpageBar'
import PathTopics from '@/components/PathTopics'
import NavLink from '@/components/NavLink'
import NewTopicSheet from '@/components/NewTopicSheet'
import { CHAPTER_MAX } from '@/lib/cards'
import Bi from '@/components/Bi'
import { Icon } from '@/components/StudyIcons'
import { isValidUserId } from '@/lib/users'
import { loadOverview } from '@/lib/queries'
import { getToday } from '@/lib/api-helpers'
import { getPath } from '@/lib/paths'
import { t } from '@/lib/i18n'

export default async function PathPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>
  searchParams: Promise<{ topic?: string }>
}) {
  const cookieStore = await cookies()
  const userId = Number(cookieStore.get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')

  const [{ path: slug }, { topic }] = await Promise.all([params, searchParams])
  const path = getPath(slug)
  if (!path) notFound()

  const overview = await loadOverview(userId, await getToday())
  const stats = overview.paths.find(p => p.slug === path.slug)!
  const topics = stats.topics.map(topicStats => ({
    id: topicStats.id,
    title: topicStats.title,
    label: path.topics.find(meta => meta.title === topicStats.title)?.label ?? topicStats.title,
    active: topicStats.active,
    conjugable: topicStats.conjugable,
    known: topicStats.known,
    due: topicStats.due,
    sample: topicStats.sample,
  }))

  return (
    <>
      <SubpageBar back={{ href: '/learn', label: t('learn') }} />
      <div className="nm-lt">
        <h1><Bi {...path.name} /></h1>
        <small className="nm-x">
          <Bi it={`${stats.active} carte · ${path.blurb.it}`} en={`${stats.active} cards · ${path.blurb.en}`} />
        </small>
      </div>

      <PathTopics path={path.slug} topics={topics} initialTopic={topic} />

      <NewTopicSheet path={path.slug} chapters={chapterChoices(overview.chapters)} />

      <div className="nm-float-space" />
      <div className="nm-float">
        <NavLink href={`/review?path=${path.slug}`} className="nm-cta on-ac">
          <span className="nm-st"><Bi {...path.reviewAll} /></span>
          <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
        </NavLink>
      </div>
    </>
  )
}

/** Chapters with cards so far, plus the next one, for a new topic. */
function chapterChoices(withCards: number[]): number[] {
  const next = (withCards.at(-1) ?? 0) + 1
  return next <= CHAPTER_MAX ? [...withCards, next] : withCards
}
