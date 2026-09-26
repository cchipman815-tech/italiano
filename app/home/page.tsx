import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LargeTitle from '@/components/LargeTitle'
import NavLink from '@/components/NavLink'
import Ring from '@/components/Ring'
import Bi from '@/components/Bi'
import { Icon } from '@/components/StudyIcons'
import { getUserById, isValidUserId } from '@/lib/users'
import { loadOverview } from '@/lib/queries'
import { knownShare, type TopicStats } from '@/lib/overview'
import { MODES, PATHS, getPathByCategory, modesForPath } from '@/lib/paths'
import { t } from '@/lib/i18n'
import { todayString } from '@/lib/srs'
import { TZ_COOKIE, formatDay, greeting, nextReviewLabel, parseTimeZone } from '@/lib/time'

/** Continua: the most recently studied topic, opened in its path's first available mode. */
function ContinueCard({ topic }: { topic: TopicStats }) {
  const path = getPathByCategory(topic.category)
  if (!path) return null
  const mode = modesForPath(path.slug, { activeCards: topic.active, conjugableCards: topic.conjugable })
    .find(m => m.availability.available)
  if (!mode) return null

  return (
    <NavLink href={`/sets/${topic.id}/${mode.route}`} className="nm-bezel press">
      <span className="core">
        <span>
          <span className="nm-eb nm-x"><Bi k="continue" /></span>
          <span className="ser" lang="it">{topic.title}</span>
          <small className="tab-n nm-x"><Bi {...MODES[mode.mode].name} /> · {topic.known} / {topic.active}</small>
        </span>
        <span className="nm-orb"><Icon name="arrow" strokeWidth={2} /></span>
        <span className="nm-arc"><i style={{ width: `${Math.round(knownShare(topic) * 100)}%` }} /></span>
      </span>
    </NavLink>
  )
}

export default async function OggiPage() {
  const cookieStore = await cookies()
  const userId = Number(cookieStore.get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')

  const user = getUserById(userId)
  const overview = await loadOverview(userId)
  const zone = parseTimeZone(cookieStore.get(TZ_COOKIE)?.value)
  const now = new Date()
  const hello = greeting(now, zone)
  const next = overview.nextReviewAt ? nextReviewLabel(overview.nextReviewAt, todayString()) : null

  return (
    <>
      <LargeTitle title={t('today')} hello={`${hello.it}, ${user.name}`} sub={<Bi {...formatDay(now, zone)} />} />

      <div className="nm-read">
        <b className="ser tab-n">{overview.due}</b>
        <div>
          <span className="due"><Bi k="due" /></span>
          {overview.new > 0 && <span className="new tab-n">+ {overview.new} <Bi k="new" /></span>}
        </div>
      </div>

      {overview.due === 0 ? (
        <div className="nm-empty" style={{ paddingTop: 18 }}>
          <h2 className="nm-x"><Bi k="nothingDue" /></h2>
          {next && (
            <p className="nm-st">
              <Bi it={`Il prossimo ripasso è ${next.it}.`} en={`Your next review is ${next.en}.`} />
            </p>
          )}
        </div>
      ) : (
        overview.lastTopic && <ContinueCard topic={overview.lastTopic} />
      )}

      <div className="nm-gh"><Bi k="yourPaths" /></div>
      <div className="nm-paths nm-st">
        {PATHS.map(path => {
          const stats = overview.paths.find(p => p.slug === path.slug)!
          return (
            <NavLink key={path.slug} href={`/learn/${path.slug}`} className="nm-path press">
              <span className="top">
                <span className="duo"><Icon name={path.icon} /></span>
                <Ring value={knownShare(stats)} />
              </span>
              <span>
                <b><Bi {...path.name} /></b>
                <small className="tab-n">
                  {stats.active}
                  {stats.due > 0 && <> · <span className="due">{stats.due} ↻</span></>}
                </small>
              </span>
            </NavLink>
          )
        })}
      </div>

      <div className="nm-float-space" />
      <div className="nm-float">
        <NavLink href={overview.due > 0 ? '/review' : '/learn'} nav={overview.due > 0 ? 'push' : 'tab'} className="nm-cta on-ac">
          <span className="nm-st"><Bi k={overview.due > 0 ? 'reviewAll' : 'learnNew'} /></span>
          <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
        </NavLink>
      </div>
    </>
  )
}
