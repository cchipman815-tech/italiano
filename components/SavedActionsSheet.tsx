'use client'
import { useEffect, useRef } from 'react'
import { PATHS, getPathByCategory } from '@/lib/paths'
import { plainText, t } from '@/lib/i18n'
import type { TopicChoice } from '@/lib/saved'
import type { SavedTranslation } from '@/lib/types'
import Sheet from './Sheet'
import { useShell } from './Shell'
import { speak } from './Speak'
import { Icon } from './StudyIcons'
import Bi from './Bi'

export type ActionsPanel = 'main' | 'topics'

/** Topics in path order, then any set outside the four paths. */
function orderTopics(topics: TopicChoice[]) {
  const inPaths = PATHS.flatMap(path => topics.filter(t => t.category === path.category).map(topic => ({ topic, path })))
  const others = topics.filter(t => !getPathByCategory(t.category)).map(topic => ({ topic, path: null }))
  return [...inPaths, ...others]
}

/**
 * The row actions sheet in Salvate: Ascolta, Aggiungi a un argomento (which
 * swaps the list for the topics) and Elimina.
 */
export default function SavedActionsSheet({
  item,
  open,
  panel,
  topics,
  onPanel,
  onClose,
  onAdd,
  onDelete,
}: {
  item: SavedTranslation | null
  open: boolean
  panel: ActionsPanel
  topics: TopicChoice[]
  onPanel: (panel: ActionsPanel) => void
  onClose: () => void
  onAdd: (item: SavedTranslation, topic: TopicChoice) => void
  onDelete: (item: SavedTranslation) => void
}) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const topicsRef = useRef<HTMLDivElement>(null)

  // Moving to the topics puts focus on the first one.
  useEffect(() => {
    if (panel === 'topics') topicsRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }, [panel])

  const choices = orderTopics(topics)

  return (
    <Sheet
      open={open && item != null}
      onClose={onClose}
      label={item?.italian ?? plainText(t('actions'), imm)}
      detents={[0.62]}
      header={item && (
        <div className="nm-sh-h">
          <div className="ser" lang="it">{item.italian}</div>
          <small>{item.english}</small>
        </div>
      )}
    >
      {item && (
        <div className="nm-scrl">
          {panel === 'main' ? (
            <div className="nm-list sm nm-st">
              <button type="button" className="nm-row sr" onClick={() => void speak(item.italian)}>
                <span className="duo"><Icon name="speak" /></span>
                <span className="t"><b><Bi k="listen" /></b></span>
              </button>
              <button type="button" className="nm-row sr" onClick={() => onPanel('topics')}>
                <span className="duo"><Icon name="plus" /></span>
                <span className="t">
                  <b><Bi k="addToTopic" /></b>
                  <small className="nm-x"><Bi k="addToTopicHint" /></small>
                </span>
                <Icon name="chev" size={14} strokeWidth={2.4} className="chev" />
              </button>
              <button type="button" className="nm-row sr danger" onClick={() => onDelete(item)}>
                <span className="duo"><Icon name="trash" /></span>
                <span className="t"><b><Bi k="delete" /></b></span>
              </button>
            </div>
          ) : (
            <div ref={topicsRef}>
              <div className="az-h nm-x">
                <Bi k="chooseTopic" />
                <button type="button" className="link-btn" onClick={() => onPanel('main')}><Bi k="back" /></button>
              </div>
              {choices.length === 0 ? (
                <p className="sv-none nm-x"><Bi k="noTopics" /></p>
              ) : (
                <div className="nm-list sm">
                  {choices.map(({ topic, path }) => (
                    <button key={topic.id} type="button" className="nm-row" onClick={() => onAdd(item, topic)}>
                      <span className="duo"><Icon name={path?.icon ?? 'cards'} /></span>
                      <span className="t">
                        <b lang="it">{topic.title}</b>
                        <small className="nm-x">{path ? <Bi {...path.name} /> : <Bi k="otherTopics" />}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
