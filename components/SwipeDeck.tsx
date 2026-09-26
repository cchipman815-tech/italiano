'use client'
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { reducedMotion, reflow, tokenMs } from '@/lib/motion'
import { plainText } from '@/lib/i18n'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Bi from './Bi'

/** Lo so (1), Ancora (−1) or Salta (0). */
export type Verdict = 1 | -1 | 0

/** Past 35% of the card's width (or height, upward) a drag commits. */
const THRESHOLD = 0.35
const TAP = 6

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * The swipe deck (prototype `Deck`). Tap the card to flip it in 3D. Drag right
 * for Lo so, left for Ancora, up to skip; the stamps and tint grow with the
 * drag, and past the threshold the card flies off on an arc: translate on
 * accel, transform on decel, plus a rotation. The next card rises from 95%.
 * The buttons and the keyboard (space or ↑ flips, → ← answer, ↓ skips) do the same.
 *
 * The parent owns the deck: `onCommit` reports a verdict as the fling starts,
 * and `onAdvance` asks for the next card (a new `itemKey`) once it has left.
 */
export default function SwipeDeck({
  itemKey,
  front,
  back,
  onCommit,
  onAdvance,
}: {
  itemKey: string
  front: ReactNode
  back: ReactNode
  onCommit: (verdict: Verdict) => void
  onAdvance: () => void
}) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const [flipped, setFlipped] = useState(false)
  const [, setGeneration] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const tintRef = useRef<HTMLDivElement>(null)
  const knowRef = useRef<HTMLSpanElement>(null)
  const learnRef = useRef<HTMLSpanElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const rimRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const rising = useRef(false)
  const drag = useRef({ down: false, x0: 0, y0: 0, dx: 0, dy: 0 })
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  function paint() {
    const card = cardRef.current!
    const { dx, dy } = drag.current
    const r = dx / card.offsetWidth
    card.style.translate = `${dx}px ${dy}px`
    card.style.rotate = `${r * 12}deg`
    tintRef.current!.style.background = r > 0 ? 'rgba(var(--ok-rgb),.18)' : 'rgba(var(--no-rgb),.18)'
    tintRef.current!.style.opacity = String(Math.min(1, Math.abs(r) * 2.4))
    knowRef.current!.style.opacity = String(clamp01(r * 3))
    learnRef.current!.style.opacity = String(clamp01(-r * 3))
  }

  function clearDrag() {
    for (const el of [tintRef.current, knowRef.current, learnRef.current]) if (el) el.style.opacity = '0'
  }

  /** Springs back to the middle after a drag that didn't commit. */
  function settle() {
    const card = cardRef.current!
    card.style.transition = 'translate var(--d-medium) var(--e-decel), rotate var(--d-medium) var(--e-decel)'
    card.style.translate = ''
    card.style.rotate = ''
    drag.current.dx = drag.current.dy = 0
    clearDrag()
  }

  function flash(cls: 'fx-ok' | 'fx-no') {
    const rim = rimRef.current
    if (!rim) return
    rim.classList.remove('fx-ok', 'fx-no')
    reflow(rim)
    rim.classList.add(cls)
    later(() => rim.classList.remove(cls), tokenMs('--d-micro', 150) + 60)
  }

  function flip() {
    if (!busy.current) setFlipped(f => !f)
  }

  function commit(verdict: Verdict) {
    if (busy.current) return
    busy.current = true
    const card = cardRef.current!
    const { dx, dy } = drag.current
    if (reducedMotion()) {
      card.style.transition = 'opacity var(--d-small) var(--e-standard)'
    } else {
      // x accelerates away while y decelerates: together the two curves draw an arc.
      card.style.transition = 'translate var(--d-small) var(--e-accel), rotate var(--d-small) var(--e-accel), transform var(--d-small) var(--e-decel), opacity var(--d-small) var(--e-accel)'
      if (verdict === 0) {
        card.style.translate = `${dx}px -150%`
        card.style.transform = 'translateX(0)'
      } else {
        card.style.translate = `${verdict * card.offsetWidth * 1.45}px ${dy}px`
        card.style.transform = 'translateY(70px)'
        card.style.rotate = `${verdict * 26}deg`
      }
    }
    card.style.opacity = reducedMotion() ? '0' : '.2'
    if (verdict) flash(verdict > 0 ? 'fx-ok' : 'fx-no')
    if (hintRef.current) hintRef.current.style.opacity = '0'
    onCommit(verdict)

    later(() => {
      // Put the card back unseen, unflipped without turning, then let the next one rise.
      innerRef.current!.style.transition = 'none'
      card.style.transition = 'none'
      card.style.translate = card.style.rotate = card.style.transform = ''
      card.style.opacity = '0'
      card.style.scale = '.95'
      drag.current.dx = drag.current.dy = 0
      clearDrag()
      rising.current = true
      setFlipped(false)
      setGeneration(g => g + 1)
      onAdvance()
    }, tokenMs('--d-small', 250))
  }

  useLayoutEffect(() => {
    if (!rising.current) return
    rising.current = false
    const card = cardRef.current
    const inner = innerRef.current
    if (!card || !inner) return
    reflow(card)
    inner.style.transition = ''
    card.style.transition = 'opacity var(--d-small) var(--e-decel), scale var(--d-small) var(--e-decel)'
    card.style.opacity = '1'
    card.style.scale = '1'
    later(() => { busy.current = false }, tokenMs('--d-small', 250))
  })

  // ── pointer: drag to answer, tap to flip ──
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (busy.current || (e.target as Element).closest('button')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { down: true, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }
    e.currentTarget.style.transition = 'none'
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d.down) return
    d.dx = e.clientX - d.x0
    const ry = e.clientY - d.y0
    d.dy = Math.min(0, ry) * 0.8 + Math.max(0, ry) * 0.2
    paint()
  }

  function onPointerUp() {
    const d = drag.current
    if (!d.down) return
    d.down = false
    const width = cardRef.current!.offsetWidth
    const r = d.dx / width
    if (Math.abs(d.dx) < TAP && Math.abs(d.dy) < TAP) { settle(); flip(); return }
    if (r > THRESHOLD) commit(1)
    else if (r < -THRESHOLD) commit(-1)
    else if (d.dy < -width * THRESHOLD) commit(0)
    else settle()
  }

  function onPointerCancel() {
    if (!drag.current.down) return
    drag.current.down = false
    settle()
  }

  // ── keyboard: space or ↑ flips, → knows, ← still learning, ↓ skips ──
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
    const target = e.target instanceof Element ? e.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    const onControl = target != null && target !== cardRef.current && target.closest('button, a') != null
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') {
      if (onControl && e.key !== 'ArrowUp') return
      e.preventDefault()
      flip()
    } else if (e.key === 'ArrowRight') { e.preventDefault(); commit(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); commit(-1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); commit(0) }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <div className="nm-stage">
        <div className="nm-under" />
        <div
          ref={cardRef}
          data-item={itemKey}
          className={`nm-card${flipped ? ' flipped' : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={plainText({ it: 'Carta: tocca per girare, frecce per rispondere', en: 'Card: tap to flip, arrow keys to answer' }, imm)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div ref={innerRef} className="nm-inner">
            <div className="nm-face front" inert={flipped}>{front}</div>
            <div className="nm-face back" inert={!flipped}>{back}</div>
          </div>
          <div ref={tintRef} className="nm-tint" />
          <span ref={knowRef} className="nm-stamp st-k" aria-hidden="true"><Icon name="check" size={14} strokeWidth={2.8} />LO SO</span>
          <span ref={learnRef} className="nm-stamp st-l" aria-hidden="true"><Icon name="x" size={14} strokeWidth={2.8} />ANCORA</span>
        </div>
      </div>
      <div ref={hintRef} className="nm-gest" aria-hidden="true">
        <span>← <span lang="it">ancora</span></span>
        <span>↑ <span lang="it">salta</span></span>
        <span><span lang="it">lo so</span> →</span>
      </div>
      <div className="nm-ans nm-st st-pad">
        <button type="button" className="no" onClick={() => commit(-1)}>
          <Icon name="x" size={20} strokeWidth={2.6} />
          <Bi k="stillLearning" />
        </button>
        <button type="button" className="sk" aria-label={plainText({ it: 'Salta', en: 'Skip' }, imm)} onClick={() => commit(0)}>
          <Icon name="arrow" size={20} strokeWidth={2.6} className="-rotate-90" />
        </button>
        <button type="button" className="ok" onClick={() => commit(1)}>
          <Icon name="check" size={20} strokeWidth={2.6} />
          <Bi k="knowIt" />
        </button>
      </div>
      <div ref={rimRef} className="nm-rim" aria-hidden="true" />
    </>
  )
}
