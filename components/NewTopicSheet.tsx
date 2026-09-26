'use client'
import { useState } from 'react'
import { PATHS, type PathSlug } from '@/lib/paths'
import { plainText, t } from '@/lib/i18n'
import { TOPIC_TITLE_MAX } from '@/lib/cards'
import { useShell } from './Shell'
import Sheet from './Sheet'
import { Icon } from './StudyIcons'
import Bi from './Bi'

/**
 * "+ Nuovo argomento" on a path page and its sheet: a name (an inline error
 * if it's empty), the path (which sets the topic's category) and an optional
 * Prego chapter. Creating it opens Modifica argomento on the new topic; the
 * chapter goes to the cards added there.
 */
export default function NewTopicSheet({ path, chapters }: { path: PathSlug; chapters: number[] }) {
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(0)

  return (
    <>
      <div className="nm-list" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="nm-row add"
          onClick={() => { setRound(r => r + 1); setOpen(true) }}
        >
          <span className="duo"><Icon name="plus" /></span>
          <span className="t"><b><Bi k="newTopic" /></b></span>
        </button>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Nuovo argomento"
        detents={[0.74]}
        header={(
          <div className="nm-sh-h">
            <div className="ser"><Bi k="newTopic" /></div>
            <small className="nm-x"><Bi k="newTopicHint" /></small>
          </div>
        )}
      >
        <NewTopicForm key={round} initialPath={path} chapters={chapters} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  )
}

function NewTopicForm({ initialPath, chapters, onDone }: { initialPath: PathSlug; chapters: number[]; onDone: () => void }) {
  const shell = useShell()
  const imm = shell?.prefs.imm ?? 'mix'
  const [title, setTitle] = useState('')
  const [path, setPath] = useState(initialPath)
  const [cap, setCap] = useState<number | null>(null)
  const [missing, setMissing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  async function create() {
    const name = title.trim()
    if (!name) {
      setMissing(true)
      document.getElementById('nw-t')?.focus()
      return
    }
    setBusy(true)
    setFailed(false)
    try {
      const category = PATHS.find(p => p.slug === path)!.category
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, category }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const set = await res.json() as { id: string }
      onDone()
      shell?.navigate(`/sets/${set.id}/edit${cap ? `?cap=${cap}` : ''}`)
    } catch {
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <>
      <div className="nm-scrl frm">
        <div className="fld sr">
          <label htmlFor="nw-t"><Bi k="name" /></label>
          <input
            id="nw-t"
            className="nm-in"
            type="text"
            lang="it"
            placeholder="es. Al mercato"
            autoComplete="off"
            enterKeyHint="go"
            maxLength={TOPIC_TITLE_MAX}
            value={title}
            aria-invalid={missing || undefined}
            aria-describedby="nw-err"
            onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setMissing(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void create() } }}
          />
          <p className="nm-err" id="nw-err" role="alert" hidden={!missing && !failed}>
            {(missing || failed) && (
              <><Icon name="x" size={15} strokeWidth={2.6} /><span className="nm-x"><Bi k={missing ? 'nameMissing' : 'cantCreate'} /></span></>
            )}
          </p>
        </div>
        <div className="fld sr">
          <span className="lb"><Bi k="path" /></span>
          <div className="pick4" role="group" aria-label={plainText(t('path'), imm)}>
            {PATHS.map(p => (
              <button key={p.slug} type="button" aria-pressed={p.slug === path} onClick={() => setPath(p.slug)}>
                <Icon name={p.icon} size={17} />
                <Bi {...p.name} itOnlyInMix />
              </button>
            ))}
          </div>
        </div>
        <div className="fld sr">
          <span className="lb"><Bi k="chapterOptional" /></span>
          <div className="nm-caps inline nm-x" role="group" aria-label={plainText(t('chapterFilter'), imm)}>
            <button type="button" aria-pressed={cap == null} onClick={() => setCap(null)}><Bi k="none" /></button>
            {chapters.map(ch => (
              <button key={ch} type="button" aria-pressed={cap === ch} onClick={() => setCap(ch)}>{ch}</button>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="nm-cta on-ac sr" disabled={busy} onClick={() => void create()}>
        <span className="nm-st"><Bi k="createTopic" /></span>
        <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
      </button>
    </>
  )
}
