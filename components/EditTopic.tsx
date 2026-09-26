'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { getPathByCategory } from '@/lib/paths'
import type { CardSnapshot, NewCard, TopicSnapshot } from '@/lib/cards'
import { italianOf } from '@/lib/study'
import { reducedMotion, tokenMs } from '@/lib/motion'
import { useShell } from './Shell'
import SubpageBar from './SubpageBar'
import CardEditor, { type CardPatch } from './CardEditor'
import AddCardSheet from './AddCardSheet'
import { Icon } from './StudyIcons'
import Bi from './Bi'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** The chapter most of the topic's cards come from, or null. */
function commonChapter(cards: Card[]): number | null {
  const counts = new Map<number, number>()
  for (const c of cards) if (c.chapter != null) counts.set(c.chapter, (counts.get(c.chapter) ?? 0) + 1)
  let best: number | null = null
  for (const [ch, n] of counts) if (best == null || n > counts.get(best)!) best = ch
  return best
}

/**
 * Modifica argomento: every card with its switch and details, a sticky
 * Aggiungi carta bar, and Elimina argomento with an inline confirm. Deletes
 * happen at once and the undo bar puts things back, progress included.
 */
export default function EditTopic({
  topic,
  initialCards,
  chapter: chosenChapter,
}: {
  topic: { id: string; title: string; category: string }
  initialCards: Card[]
  /** From Nuovo argomento: the chapter picked for a brand-new topic. */
  chapter: number | null
}) {
  const shell = useShell()
  const router = useRouter()
  const path = getPathByCategory(topic.category) ?? null
  const [cards, setCards] = useState(initialCards)
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const [fresh, setFresh] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [killStep, setKillStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const keepRef = useRef<HTMLButtonElement>(null)
  const killRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const flipFrom = useRef<Map<string, number> | null>(null)

  const active = cards.filter(c => c.enabled !== false).length
  const chapter = commonChapter(cards) ?? chosenChapter
  const pathHref = path ? `/learn/${path.slug}` : '/learn'
  const back = path ? { href: `${pathHref}?topic=${topic.id}`, label: path.name } : { href: '/learn', label: { it: 'Impara', en: 'Learn' } }

  // ── FLIP: after a row leaves or returns, the rows below slide to their new places ──
  function captureRows() {
    const tops = new Map<string, number>()
    bodyRef.current?.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => tops.set(el.dataset.flip!, el.getBoundingClientRect().top))
    flipFrom.current = tops
  }
  useLayoutEffect(() => {
    const from = flipFrom.current
    flipFrom.current = null
    if (!from || reducedMotion()) return
    bodyRef.current?.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => {
      const top = from.get(el.dataset.flip!)
      if (top == null) return
      const dy = top - el.getBoundingClientRect().top
      if (dy) el.animate([{ translate: `0 ${dy}px` }, { translate: '0 0' }], { duration: tokenMs('--d-medium', 400), easing: 'cubic-bezier(.2,0,0,1)' })
    })
  }, [cards])

  // ── saving ──
  async function patch(id: string, fields: CardPatch, alreadySaved = false): Promise<boolean> {
    const before = cards.find(c => c.id === id)
    setCards(list => list.map(c => (c.id === id ? { ...c, ...fields } : c)))
    if (alreadySaved) return true
    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return true
    } catch {
      if (before) setCards(list => list.map(c => (c.id === id ? { ...c, ...pick(before, fields) } : c)))
      shell?.showUndo({ message: <Bi k="cantSave" /> })
      return false
    }
  }

  async function add(fields: NewCard): Promise<boolean> {
    try {
      const res = await fetch(`/api/sets/${topic.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const card = await res.json() as Card
      setCards(list => [...list, card])
      setFresh(card.id)
      // Once the sheet has gone, bring the new row into view.
      setTimeout(() => {
        document.querySelector(`[data-card="${card.id}"]`)?.scrollIntoView?.({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
      }, tokenMs('--d-small', 250))
      return true
    } catch {
      return false
    }
  }

  // ── deleting a card: at once, with Annulla ──
  async function remove(card: Card) {
    setLeaving(s => new Set(s).add(card.id))
    const request = fetch(`/api/cards/${card.id}`, { method: 'DELETE' })
      .then(async res => (res.ok ? await res.json() as CardSnapshot : null))
      .catch(() => null)
    const [snapshot] = await Promise.all([request, wait(tokenMs('--d-small', 250))])
    setLeaving(s => { const n = new Set(s); n.delete(card.id); return n })
    if (!snapshot) {
      shell?.showUndo({ message: <Bi k="cantDelete" /> })
      return
    }
    captureRows()
    setCards(list => list.filter(c => c.id !== card.id))
    shell?.showUndo({
      message: <><Bi k="cardDeleted" /><b lang="it">{italianOf(card)}</b></>,
      onAction: () => void restore(snapshot),
    })
  }

  async function restore(snapshot: CardSnapshot) {
    try {
      const res = await fetch('/api/cards/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      captureRows()
      setCards(list => [...list, snapshot.card].sort((a, b) => a.sort_order - b.sort_order))
      setFresh(snapshot.card.id)
    } catch {
      shell?.showUndo({ message: <Bi k="cantRestore" /> })
    }
  }

  // ── deleting the topic: two steps, then back to the path with Annulla ──
  function askKill() {
    setKillStep('confirm')
    requestAnimationFrame(() => {
      keepRef.current?.focus({ preventScroll: true })
      keepRef.current?.parentElement?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    })
  }
  function keep() {
    setKillStep('idle')
    requestAnimationFrame(() => killRef.current?.focus({ preventScroll: true }))
  }
  async function kill() {
    setKillStep('busy')
    let snapshot: TopicSnapshot | null = null
    try {
      const res = await fetch(`/api/sets/${topic.id}`, { method: 'DELETE' })
      if (res.ok) snapshot = await res.json() as TopicSnapshot
    } catch { /* reported below */ }
    if (!snapshot) {
      setKillStep('confirm')
      shell?.showUndo({ message: <Bi k="cantDelete" /> })
      return
    }
    const saved = snapshot
    shell?.navigate(pathHref, 'back')
    shell?.showUndo({
      path: pathHref,
      message: <><Bi k="topicDeleted" /><b lang="it">{topic.title}</b></>,
      onAction: async () => {
        const res = await fetch('/api/sets/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saved),
        }).catch(() => null)
        if (res?.ok) router.refresh()
        else shell?.showUndo({ path: pathHref, message: <Bi k="cantRestore" /> })
      },
    })
  }

  const meta = {
    it: `${cards.length} ${cards.length === 1 ? 'carta' : 'carte'} · ${active} ${active === 1 ? 'attiva' : 'attive'}${chapter ? ` · cap. ${chapter}` : ''}`,
    en: `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} · ${active} active${chapter ? ` · ch. ${chapter}` : ''}`,
  }

  return (
    <>
      <SubpageBar back={back} />
      <div className="ed-body" ref={bodyRef}>
        <div className="nm-lt">
          <h1 lang="it">{topic.title}</h1>
          <small className="tab-n nm-x"><Bi {...meta} /></small>
        </div>

        <div className="ed-list">
          {cards.map(card => (
            <CardEditor
              key={card.id}
              card={card}
              path={path?.slug ?? null}
              isNew={fresh === card.id}
              leaving={leaving.has(card.id)}
              onPatch={patch}
              onDelete={remove}
            />
          ))}
        </div>

        {cards.length === 0 && (
          <div className="nm-empty">
            <span className="orb"><Icon name="cards" size={26} /></span>
            <h2 className="nm-x"><Bi k="noCards" /></h2>
            <p className="nm-st"><Bi k="noCardsHint" /></p>
          </div>
        )}

        <div className="ed-danger" data-flip="danger">
          {killStep === 'idle' ? (
            <button ref={killRef} type="button" className="nm-ghost danger" onClick={askKill}>
              <Bi k="deleteTopic" />
            </button>
          ) : (
            <div className="ed-confirm nm-x">
              <span>
                <Bi it={`Eliminare “${topic.title}” e le sue carte?`} en={`Delete “${topic.title}” and its cards?`} />
              </span>
              <button ref={keepRef} type="button" className="ed-a" disabled={killStep === 'busy'} onClick={keep}><Bi k="cancel" /></button>
              <button type="button" className="ed-a solid" disabled={killStep === 'busy'} onClick={() => void kill()}><Bi k="deleteTopic" /></button>
            </div>
          )}
        </div>
      </div>

      <div className="ed-bar glass">
        <button type="button" className="nm-cta on-ac" onClick={() => setAdding(true)}>
          <span className="nm-st"><Bi k="addCard" /></span>
          <span className="orb"><Icon name="plus" strokeWidth={2.2} /></span>
        </button>
      </div>

      <AddCardSheet
        open={adding}
        onClose={() => setAdding(false)}
        path={path?.slug ?? null}
        chapter={chapter}
        onAdd={add}
      />
    </>
  )
}

/** The fields of `card` named in `patch`, for rolling a failed save back. */
function pick(card: Card, patch: CardPatch): CardPatch {
  return Object.fromEntries(Object.keys(patch).map(k => [k, card[k as keyof CardPatch] ?? null])) as CardPatch
}
