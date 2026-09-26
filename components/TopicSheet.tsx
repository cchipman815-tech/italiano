'use client'
import { useState } from 'react'
import { MODES, modesForPath, type PathSlug } from '@/lib/paths'
import { plainText, t } from '@/lib/i18n'
import Sheet from './Sheet'
import NavLink from './NavLink'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Bi from './Bi'

export interface SheetTopic {
  id: string
  title: string
  active: number
  conjugable: number
  due: number
}

type Direction = 'it-en' | 'en-it'

/**
 * A topic's modes in the path's order, each gated by how many cards are on;
 * a direction switch for the modes that use it; Modifica argomento; and the
 * filled button: review what's due, or start the first mode when nothing is.
 */
export default function TopicSheet({
  path,
  topic,
  open,
  onClose,
}: {
  path: PathSlug
  topic: SheetTopic | null
  open: boolean
  onClose: () => void
}) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const [direction, setDirection] = useState<Direction>('it-en')
  const modes = topic ? modesForPath(path, { activeCards: topic.active, conjugableCards: topic.conjugable }) : []
  const query = direction === 'en-it' ? '?direction=en-it' : ''
  const firstMode = modes.find(m => m.availability.available)

  return (
    <Sheet
      open={open && topic != null}
      onClose={onClose}
      label={topic?.title ?? ''}
      detents={[0.62]}
      header={topic && (
        <div className="nm-sh-h">
          <div className="ser" lang="it">{topic.title}</div>
          <small className="tab-n nm-x">
            <Bi
              it={`${topic.active} carte · ${topic.due} da ripassare`}
              en={`${topic.active} cards · ${topic.due} due`}
            />
          </small>
        </div>
      )}
    >
      {topic && (
        <>
          <div className="nm-scrl">
            <div className="nm-list sm nm-st">
              {modes.map(m => m.availability.available ? (
                <NavLink key={m.mode} href={`/sets/${topic.id}/${m.route}${query}`} className="nm-row sr">
                  <span className="duo"><Icon name={m.icon} /></span>
                  <span className="t"><b><Bi {...MODES[m.mode].name} /></b></span>
                  <Icon name="chev" size={14} strokeWidth={2.4} className="chev" />
                </NavLink>
              ) : (
                <button key={m.mode} type="button" className="nm-row sr" disabled>
                  <span className="duo"><Icon name={m.icon} /></span>
                  <span className="t">
                    <b><Bi {...MODES[m.mode].name} /></b>
                    <small className="nm-x"><Bi {...m.availability.reason} /></small>
                  </span>
                </button>
              ))}
            </div>
            <div className="nm-list sm nm-st" style={{ marginTop: 8 }}>
              <NavLink href={`/sets/${topic.id}/edit`} className="nm-row sr">
                <span className="duo"><Icon name="pen" /></span>
                <span className="t">
                  <b><Bi k="editTopic" /></b>
                  <small className="nm-x"><Bi k="editTopicHint" /></small>
                </span>
                <Icon name="chev" size={14} strokeWidth={2.4} className="chev" />
              </NavLink>
            </div>
          </div>

          <div className="nm-seg sr" role="group" aria-label={plainText(t('direction'), imm)}>
            <button type="button" aria-pressed={direction === 'it-en'} onClick={() => setDirection('it-en')}>IT → EN</button>
            <button type="button" aria-pressed={direction === 'en-it'} onClick={() => setDirection('en-it')}>EN → IT</button>
          </div>

          {topic.due > 0 ? (
            <NavLink href={`/review?set=${topic.id}`} className="nm-cta on-ac sr">
              <span className="nm-st"><Bi it={`Ripassa ${topic.due}`} en={`Review ${topic.due}`} /></span>
              <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
            </NavLink>
          ) : firstMode ? (
            <NavLink href={`/sets/${topic.id}/${firstMode.route}${query}`} className="nm-cta on-ac sr">
              <span className="nm-st"><Bi k="start" /></span>
              <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
            </NavLink>
          ) : null}
        </>
      )}
    </Sheet>
  )
}
