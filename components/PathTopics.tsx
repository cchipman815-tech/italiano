'use client'
import { useCallback, useState } from 'react'
import type { PathSlug } from '@/lib/paths'
import { Icon } from './StudyIcons'
import Ring from './Ring'
import TopicSheet, { type SheetTopic } from './TopicSheet'

export interface PathTopic extends SheetTopic {
  /** Short row label (e.g. "-are" under Verbi); the title for user-made topics. */
  label: string
  known: number
  sample: string[]
}

/**
 * The path page's topic rows. A row opens the topic sheet; `?topic=<id>`
 * opens it on arrival (study screens come back here that way).
 */
export default function PathTopics({
  path,
  topics,
  initialTopic,
}: {
  path: PathSlug
  topics: PathTopic[]
  initialTopic?: string
}) {
  const [openId, setOpenId] = useState<string | null>(
    initialTopic && topics.some(t => t.id === initialTopic) ? initialTopic : null,
  )
  const [shownId, setShownId] = useState<string | null>(openId)

  const close = useCallback(() => {
    setOpenId(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has('topic')) {
      url.searchParams.delete('topic')
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])

  function open(id: string) {
    setShownId(id)
    setOpenId(id)
  }

  // Keep the last topic's content while the sheet slides away.
  const shown = topics.find(t => t.id === shownId) ?? null

  return (
    <>
      <div className="nm-list" style={{ marginTop: 14 }}>
        {topics.map(topic => (
          <button key={topic.id} type="button" className="nm-row" onClick={() => open(topic.id)}>
            <Ring value={topic.active ? topic.known / topic.active : 0} />
            <span className="t">
              <b lang="it">{topic.label}</b>
              <small className="tab-n">
                <span lang="it">{topic.active}{topic.sample.length > 0 && ` · ${topic.sample.join(', ')}…`}</span>
                {topic.due > 0 && <> <span className="due">{topic.due} ↻</span></>}
              </small>
            </span>
            <Icon name="chev" size={14} strokeWidth={2.4} className="chev" />
          </button>
        ))}
      </div>
      <TopicSheet path={path} topic={shown} open={openId != null} onClose={close} />
    </>
  )
}
