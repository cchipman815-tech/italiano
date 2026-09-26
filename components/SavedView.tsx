'use client'
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { groupByDay, matchesQuery, type TopicChoice } from '@/lib/saved'
import { plainText, t } from '@/lib/i18n'
import type { SavedTranslation } from '@/lib/types'
import LargeTitle from './LargeTitle'
import NavLink from './NavLink'
import SavedActionsSheet, { type ActionsPanel } from './SavedActionsSheet'
import { useShell } from './Shell'
import { SpeakOrb } from './Speak'
import { Icon } from './StudyIcons'
import Bi from './Bi'
import { tokenMs, reducedMotion } from '@/lib/motion'

/** A saved row, with a key that survives a delete and undo (the server gives the restored row a new id). */
interface Row extends SavedTranslation {
  key: string
}

const SWIPE_DELETE = 0.35

const byNewest = (a: Row, b: Row) => b.created_at.localeCompare(a.created_at)

/**
 * Salvate: the user's own saved translations, grouped by day and searchable.
 * Swipe a row left, or use its actions sheet, to delete it; the undo bar
 * brings it back. The sheet can also make a row into a card in a topic.
 */
export default function SavedView({
  initial,
  topics,
  now,
  timeZone,
}: {
  initial: SavedTranslation[]
  topics: TopicChoice[]
  /** The server's clock, so grouping renders the same on both sides. */
  now: string
  timeZone: string
}) {
  const shell = useShell()
  const imm = shell?.prefs.imm ?? 'mix'
  const [rows, setRows] = useState<Row[]>(() => initial.map(item => ({ ...item, key: item.id })))
  const [query, setQuery] = useState('')
  const [gone, setGone] = useState<Set<string>>(new Set())
  const [sheet, setSheet] = useState<{ key: string; open: boolean; panel: ActionsPanel } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── FLIP: after a row leaves or returns, the rest slide from where they were ──
  // Elements that move carry data-flip with their key.
  const listRef = useRef<HTMLDivElement>(null)
  const before = useRef<Map<string, number> | null>(null)
  const fadeKey = useRef<string | null>(null)
  const flipEls = () => [...(listRef.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])]
  function capture() {
    before.current = new Map(flipEls().map(el => [el.dataset.flip!, el.getBoundingClientRect().top]))
  }
  useLayoutEffect(() => {
    const prev = before.current
    const fade = fadeKey.current
    before.current = null
    fadeKey.current = null
    if (!prev || reducedMotion()) return
    flipEls().forEach(el => {
      const key = el.dataset.flip!
      const top = prev.get(key)
      if (key === fade || top == null) {
        el.style.transition = 'none'
        el.style.opacity = '0'
        void el.offsetHeight
        el.style.transition = 'opacity var(--d-small) var(--e-decel)'
        el.style.opacity = ''
        return
      }
      const dy = top - el.getBoundingClientRect().top
      if (!dy) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
      void el.offsetHeight
      el.style.transition = 'transform var(--d-medium) var(--e-standard)'
      el.style.transform = ''
    })
  }, [rows])

  // ── deleting and undoing ──
  function restore(row: Row, deleted: Promise<boolean>) {
    void (async () => {
      await deleted
      capture()
      fadeKey.current = row.key
      setRows(list => [...list, row].sort(byNewest))
      try {
        const res = await fetch('/api/saved-translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ english: row.english, italian: row.italian, created_at: row.created_at }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const saved = await res.json() as SavedTranslation
        setRows(list => list.map(r => (r.key === row.key ? { ...saved, key: row.key } : r)).sort(byNewest))
      } catch {
        capture()
        setRows(list => list.filter(r => r.key !== row.key))
        shell?.showUndo({ message: <Bi k="cantRestore" /> })
      }
    })()
  }

  function remove(row: Row) {
    setGone(g => new Set(g).add(row.key))
    const deleted = fetch(`/api/saved-translations/${row.id}`, { method: 'DELETE' })
      .then(res => res.ok || res.status === 404)
      .catch(() => false)
    // The row slides out first, then the rest close the gap.
    const slidOut = new Promise(resolve => setTimeout(resolve, reducedMotion() ? 0 : tokenMs('--d-small', 250)))

    void slidOut.then(() => {
      capture()
      setRows(list => list.filter(r => r.key !== row.key))
      setGone(g => { const next = new Set(g); next.delete(row.key); return next })
      shell?.showUndo({
        message: <><Bi k="deletedPrefix" /><b lang="it">{row.italian}</b></>,
        onAction: () => restore(row, deleted),
      })
    })
    // Runs after the block above, so a failure always has the last word.
    void Promise.all([deleted, slidOut]).then(([ok]) => {
      if (ok) return
      capture()
      setRows(list => (list.some(r => r.key === row.key) ? list : [...list, row].sort(byNewest)))
      shell?.showUndo({ message: <Bi k="cantDelete" /> })
    })
  }

  // ── Aggiungi a un argomento ──
  async function addToTopic(row: Row, topic: TopicChoice) {
    closeSheet()
    const name = <b lang="it">{topic.title}</b>
    try {
      const res = await fetch(`/api/saved-translations/${row.id}/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: topic.id }),
      })
      if (res.status === 409) {
        shell?.showUndo({ message: <><Bi k="alreadyIn" />{name}</> })
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const card = await res.json() as { id: string }
      shell?.showUndo({
        message: <><Bi k="addedTo" />{name}</>,
        onAction: () => { void fetch(`/api/cards/${card.id}`, { method: 'DELETE' }) },
      })
    } catch {
      shell?.showUndo({ message: <Bi k="cantAdd" /> })
    }
  }

  const openRow = (row: Row) => setSheet({ key: row.key, open: true, panel: 'main' })
  const closeSheet = () => setSheet(s => (s ? { ...s, open: false } : s))
  const sheetRow = sheet ? rows.find(r => r.key === sheet.key) ?? null : null

  const visible = rows.filter(r => matchesQuery(r, query))
  const groups = groupByDay(visible, new Date(now), timeZone)
  const count = rows.length

  return (
    <>
      <LargeTitle
        title={t('saved')}
        sub={count > 0 && (
          <span className="tab-n">
            <Bi it={`${count} ${count === 1 ? 'salvata' : 'salvate'} da te`} en={`${count} saved by you`} />
          </span>
        )}
      />

      {count > 0 && (
        <div className="sv-search">
          <Icon name="search" size={17} />
          <label className="sr-only" htmlFor="sv-q">{plainText(t('searchSaved'), imm)}</label>
          <input
            ref={searchRef}
            id="sv-q"
            className="nm-in"
            type="search"
            placeholder={plainText(t('search'), imm === 'en' ? 'en' : 'it')}
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      )}

      <div ref={listRef}>
        {groups.map(group => (
          <section key={group.key} aria-label={plainText(group.label, imm)}>
            <div data-flip={`g:${group.key}`} className="nm-gh" aria-hidden="true"><Bi {...group.label} /></div>
            <div className="nm-list">
              {group.items.map(row => (
                <SavedRow
                  key={row.key}
                  row={row}
                  gone={gone.has(row.key)}
                  onOpen={() => openRow(row)}
                  onSwipeDelete={() => remove(row)}
                />
              ))}
            </div>
          </section>
        ))}

        {count > 0 && visible.length === 0 && (
          <div className="sv-none nm-x">
            <p><Bi it="Nessun risultato per “" en="No results for “" /><b>{query.trim()}</b>”.</p>
            <button type="button" className="link-btn" onClick={() => { setQuery(''); searchRef.current?.focus() }}>
              <Bi k="clearSearch" />
            </button>
          </div>
        )}

        {count === 0 && (
          <div data-flip="empty" className="nm-empty">
            <span className="orb"><Icon name="bookmark" size={26} strokeWidth={1.6} /></span>
            <h2 className="nm-x"><Bi k="noSaved" /></h2>
            <p className="nm-st"><Bi k="noSavedHint" /></p>
            <NavLink href="/translate" nav="tab" className="nm-ghost"><Bi k="openTranslate" /></NavLink>
          </div>
        )}
      </div>

      <SavedActionsSheet
        item={sheetRow}
        open={Boolean(sheet?.open)}
        panel={sheet?.panel ?? 'main'}
        topics={topics}
        onPanel={panel => setSheet(s => (s ? { ...s, panel } : s))}
        onClose={closeSheet}
        onAdd={(_, topic) => { if (sheetRow) void addToTopic(sheetRow, topic) }}
        onDelete={() => {
          if (!sheetRow) return
          closeSheet()
          const row = sheetRow
          setTimeout(() => remove(row), reducedMotion() ? 0 : tokenMs('--d-small', 250))
        }}
      />
    </>
  )
}

/**
 * One saved translation. Tapping opens its actions; dragging it left shows
 * the delete layer, which arms past 35% of the width and deletes on release.
 */
function SavedRow({
  row,
  gone,
  onOpen,
  onSwipeDelete,
}: {
  row: Row
  gone: boolean
  onOpen: () => void
  onSwipeDelete: () => void
}) {
  const [armed, setArmed] = useState(false)
  const dragged = useRef(false)

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.spk2')) return
    const fg = e.currentTarget
    const width = fg.getBoundingClientRect().width
    const x0 = e.clientX
    const y0 = e.clientY
    const pointer = e.pointerId
    let dx = 0
    let dragging = false

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return
      dx = Math.min(0, ev.clientX - x0)
      if (!dragging) {
        const dy = Math.abs(ev.clientY - y0)
        if (-dx > 8 && -dx > dy) {
          dragging = true
          fg.classList.add('dragging')
          try { fg.setPointerCapture(pointer) } catch { /* the pointer already ended */ }
        } else if (dy > 8) {
          end()
          return
        } else {
          return
        }
      }
      fg.style.translate = `${dx}px 0`
      setArmed(-dx > width * SWIPE_DELETE)
    }
    const up = () => {
      end()
      if (!dragging) return
      // Swallow the click that follows this pointerup, but only that one.
      dragged.current = true
      setTimeout(() => { dragged.current = false }, 0)
      fg.classList.remove('dragging')
      setArmed(false)
      // Past the threshold, .gone carries the row off from where the finger let go; otherwise it settles back.
      fg.style.translate = ''
      if (-dx > width * SWIPE_DELETE) onSwipeDelete()
    }
    const end = () => {
      fg.removeEventListener('pointermove', move)
      fg.removeEventListener('pointerup', up)
      fg.removeEventListener('pointercancel', up)
    }
    fg.addEventListener('pointermove', move)
    fg.addEventListener('pointerup', up)
    fg.addEventListener('pointercancel', up)
  }

  return (
    <div data-flip={row.key} className={`sv-row${armed ? ' arm' : ''}${gone ? ' gone' : ''}`}>
      <div className="sv-under nm-x" aria-hidden="true">
        <Icon name="trash" size={18} strokeWidth={2.2} />
        <Bi k="delete" />
      </div>
      <div className="sv-fg" onPointerDown={onPointerDown}>
        <button
          type="button"
          className="sv-main"
          aria-haspopup="dialog"
          onClickCapture={e => {
            if (!dragged.current) return
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={onOpen}
        >
          <b className="ser" lang="it">{row.italian}</b>
          <small>{row.english}</small>
        </button>
        <SpeakOrb text={row.italian} />
      </div>
    </div>
  )
}
