'use client'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '@/lib/types'
import { buildMatchRounds, formatSeconds, italianOf, type MatchRound, type BackLink } from '@/lib/study'
import { saveProgress } from '@/lib/progress-client'
import { reducedMotion, tokenMs } from '@/lib/motion'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Bi from './Bi'

interface Props {
  /** Built on the server (lib/study.ts buildMatchRounds) so hydration matches. */
  rounds: MatchRound[]
  /** The topic's enabled cards, to deal fresh rounds for "Gioca ancora". */
  cards: Card[]
  setId: string
  back: BackLink
}

interface Tile {
  side: 'it' | 'en'
  /** Index into the round's pairs. */
  k: number
}

const secondsSince = (start: number) => Math.floor((Date.now() - start) / 1000)

/** Best times live in this browser only: a per-person convenience, not progress. */
function readBest(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch { return null }
}
function writeBest(key: string, seconds: number) {
  try { localStorage.setItem(key, String(seconds)) } catch {}
}

/**
 * Abbina: tap an Italian word, then its meaning. Two columns keep every tile
 * thumb-sized; matched pairs stay in place, checked. A wrong pair shakes once.
 */
export default function MatchStudy({ rounds: initial, cards, setId, back }: Props) {
  const userId = useShell()?.user?.id ?? 0
  const [rounds, setRounds] = useState(initial)
  const [round, setRound] = useState(0)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<Tile | null>(null)
  const [bad, setBad] = useState<Tile[]>([])
  const [swap, setSwap] = useState(false)
  const [misses, setMisses] = useState(0)
  const [pairsDone, setPairsDone] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<{ seconds: number; best: { time: string; isNew: boolean } } | null>(null)
  const startedAt = useRef(0)
  const timers = useRef<number[]>([])

  const totalPairs = rounds.reduce((n, r) => n + r.pairs.length, 0)
  const current = rounds[round]
  const locked = bad.length > 0 || swap

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  useEffect(() => {
    if (result) return
    startedAt.current = Date.now()
    const tick = window.setInterval(() => setElapsed(secondsSince(startedAt.current)), 1000)
    return () => clearInterval(tick)
  }, [result])

  function finish() {
    const seconds = secondsSince(startedAt.current)
    const key = `abbina-best:${userId}:${setId}`
    const prev = readBest(key)
    const isNew = prev == null || seconds < prev
    if (isNew) writeBest(key, seconds)
    setResult({ seconds, best: { time: formatSeconds(isNew ? seconds : prev), isNew } })
  }

  function tap(tile: Tile) {
    if (locked || matched.has(tile.k)) return
    if (!selected || selected.side === tile.side) {
      setSelected(selected && selected.k === tile.k && selected.side === tile.side ? null : tile)
      return
    }
    setSelected(null)
    if (selected.k === tile.k) {
      const next = new Set(matched).add(tile.k)
      setMatched(next)
      setPairsDone(n => n + 1)
      saveProgress(current.pairs[tile.k].id, true)
      if (next.size === current.pairs.length) {
        later(() => {
          if (round + 1 >= rounds.length) { finish(); return }
          setSwap(true)
          later(() => {
            setRound(r => r + 1)
            setMatched(new Set())
            setSwap(false)
          }, reducedMotion() ? 0 : tokenMs('--d-small', 250))
        }, 500)
      }
    } else {
      setMisses(m => m + 1)
      setBad([selected, tile])
      later(() => setBad([]), 650)
    }
  }

  function again() {
    setRounds(buildMatchRounds(cards))
    setRound(0)
    setMatched(new Set())
    setSelected(null)
    setMisses(0)
    setPairsDone(0)
    setElapsed(0)
    setResult(null)
  }

  if (result) {
    return (
      <SessionComplete
        mode="match"
        result={{ right: totalPairs, wrong: misses, total: totalPairs, seconds: formatSeconds(result.seconds), best: result.best }}
        back={back}
        onAgain={again}
      />
    )
  }

  function tileEl(side: 'it' | 'en', k: number) {
    const card = current.pairs[k]
    const isMatched = matched.has(k)
    const isSel = selected?.side === side && selected.k === k
    const isBad = bad.some(b => b.side === side && b.k === k)
    const cls = ['mt-tile', side, isMatched && 'ok', isSel && 'sel', isBad && 'bad'].filter(Boolean).join(' ')
    return (
      <button
        key={`${side}-${card.id}`}
        type="button"
        className={cls}
        lang={side === 'it' ? 'it' : undefined}
        aria-pressed={isSel}
        disabled={isMatched}
        onClick={() => tap({ side, k })}
      >
        <span>{side === 'it' ? italianOf(card) : card.english}</span>
        <Icon name="check" size={16} strokeWidth={2.8} className="mk k" />
        <Icon name="x" size={16} strokeWidth={2.8} className="mk x" />
      </button>
    )
  }

  return (
    <div className="st-view">
      <StudyTop
        back={back}
        count={<span className="tab-n nm-x"><Bi it="Turno" en="Round" /> {round + 1} / {rounds.length} · {formatSeconds(elapsed)}</span>}
        progress={pairsDone / totalPairs}
      />
      <p className="mt-hint nm-x"><Bi it="Tocca una parola, poi il suo significato." en="Tap a word, then its meaning." /></p>
      <div className={`mt-board st-pad${swap ? ' swap' : ''}`}>
        <div className="mt-col">{current.pairs.map((_, k) => tileEl('it', k))}</div>
        <div className="mt-col">{current.englishOrder.map(k => tileEl('en', k))}</div>
      </div>
    </div>
  )
}
