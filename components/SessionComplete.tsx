'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Bilingual } from '@/lib/paths'
import { flushSaves } from '@/lib/progress-client'
import { listWords, type BackLink } from '@/lib/study'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import SubpageBar from './SubpageBar'
import Bi from './Bi'

export type SessionMode = 'review' | 'flashcard' | 'conjugations' | 'quiz' | 'listening' | 'match' | 'sentences'

export interface SessionResult {
  /** Swipe modes: Lo so / Ancora. Choice modes: right / wrong. */
  right: number
  wrong: number
  total: number
  /** What to see again, e.g. ["la stazione", "(voi) parlate"]. */
  missed?: string[]
  /** Abbina only. */
  seconds?: string
  best?: { time: string; isNew: boolean } | null
}

interface Copy {
  eyebrow: Bilingual
  big: string
  of: string
  label: Bilingual
  stats: [Bilingual, Bilingual]
  next: Bilingual | null
  again: Bilingual
}

function tomorrow(missed: string[] | undefined): Bilingual | null {
  if (!missed?.length) return null
  const list = listWords(missed)
  return { it: `Tornano domani: ${list.it}.`, en: `Coming back tomorrow: ${list.en}.` }
}

/** The finished screen's wording, per mode (prototype `doneFor`). */
function copyFor(mode: SessionMode, r: SessionResult): Copy {
  const of = ` / ${r.total}`
  const knownStats: [Bilingual, Bilingual] = [{ it: 'lo so', en: 'known' }, { it: 'ancora', en: 'learning' }]
  const rightStats: [Bilingual, Bilingual] = [{ it: 'giuste', en: 'right' }, { it: 'sbagliate', en: 'wrong' }]
  const allRight = { it: 'Tutte giuste.', en: 'All right.' }
  switch (mode) {
    case 'review':
    case 'flashcard':
      return {
        eyebrow: mode === 'review' ? { it: 'Ripasso finito', en: 'Review complete' } : { it: 'Flashcard finite', en: 'Flashcards done' },
        big: String(r.right), of, label: { it: 'carte che sai', en: 'cards you know' }, stats: knownStats,
        next: tomorrow(r.missed) ?? { it: 'Progressi salvati.', en: 'Progress saved.' },
        again: { it: 'Ripassa di nuovo', en: 'Review again' },
      }
    case 'conjugations': {
      const back = tomorrow(r.missed)
      return {
        eyebrow: { it: 'Coniugazioni finite', en: 'Conjugations done' },
        big: String(r.right), of, label: { it: 'forme che sai', en: 'forms you know' }, stats: knownStats,
        next: back ? { it: `Progressi salvati. ${back.it}`, en: `Progress saved. ${back.en}` } : { it: 'Progressi salvati.', en: 'Progress saved.' },
        again: { it: 'Di nuovo', en: 'Again' },
      }
    }
    case 'quiz':
      return {
        eyebrow: { it: 'Quiz finito', en: 'Quiz complete' },
        big: String(r.right), of, label: { it: 'risposte giuste', en: 'right answers' }, stats: rightStats,
        next: r.wrong ? { it: 'Le sbagliate tornano nel prossimo ripasso.', en: 'The ones you missed come back in your next review.' } : allRight,
        again: { it: 'Rifai il quiz', en: 'Retake the quiz' },
      }
    case 'listening': {
      const list = r.missed?.length ? listWords(r.missed) : null
      return {
        eyebrow: { it: 'Ascolto finito', en: 'Listening complete' },
        big: String(r.right), of, label: { it: 'parole riconosciute', en: 'words recognized' }, stats: rightStats,
        next: list ? { it: `Da riascoltare: ${list.it}`, en: `Listen again: ${list.en}` } : { it: "Tutte giuste. Bell'orecchio.", en: 'All right. Good ear.' },
        again: { it: 'Riascolta', en: 'Listen again' },
      }
    }
    case 'match':
      return {
        eyebrow: { it: 'Tutto abbinato', en: 'All matched' },
        big: r.seconds ?? '', of: '', label: { it: `per ${r.total} coppie`, en: `for ${r.total} pairs` },
        stats: [{ it: 'coppie', en: 'pairs' }, { it: 'errori', en: 'misses' }],
        next: r.best
          ? r.best.isNew ? { it: 'Nuovo record!', en: 'A new best!' } : { it: `Il tuo record: ${r.best.time}`, en: `Your best: ${r.best.time}` }
          : null,
        again: { it: 'Gioca ancora', en: 'Play again' },
      }
    case 'sentences':
      return {
        eyebrow: { it: 'Frasi finite', en: 'Sentences complete' },
        big: String(r.right), of, label: { it: 'risposte giuste', en: 'right answers' }, stats: rightStats,
        next: { it: 'Restano salvate: la prossima volta si aprono subito.', en: 'They stay saved, so next time they open right away.' },
        again: { it: 'Riprova', en: 'Try again' },
      }
  }
}

/**
 * The finished screen every mode shares, worded per mode. It enters in
 * stages, 100ms apart. "Torna a Oggi" waits for progress still being saved,
 * so Oggi's due count is current when it loads.
 */
export default function SessionComplete({
  mode,
  result,
  back,
  onAgain,
}: {
  mode: SessionMode
  result: SessionResult
  back: BackLink
  onAgain: () => void
}) {
  const shell = useShell()
  const router = useRouter()
  const [go, setGo] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const c = copyFor(mode, result)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    const frame = requestAnimationFrame(() => setGo(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  async function home() {
    setLeaving(true)
    await flushSaves()
    if (shell) shell.navigate('/home', 'back')
    else router.push('/home')
  }

  const [rightN, wrongN] = mode === 'match' ? [result.total, result.wrong] : [result.right, result.wrong]

  return (
    <div className={`st-view${go ? ' go' : ''}`}>
      <SubpageBar back={back} />
      <div className="nm-done">
        <h1 ref={headingRef} tabIndex={-1} className="nm-eb nm-x st-in" style={{ outline: 'none', margin: 0 }}>
          <Bi {...c.eyebrow} />
        </h1>
        <div className="big ser tab-n st-in">{c.big}{c.of && <span>{c.of}</span>}</div>
        <span className="lbl nm-x st-in"><Bi {...c.label} /></span>
        <div className="nm-stats nm-x st-in">
          <span className="st-k"><Icon name="check" size={15} strokeWidth={2.8} /><span className="tab-n">{rightN}</span>&nbsp;<Bi {...c.stats[0]} /></span>
          <span className="st-l"><Icon name="x" size={15} strokeWidth={2.8} /><span className="tab-n">{wrongN}</span>&nbsp;<Bi {...c.stats[1]} /></span>
        </div>
        {c.next ? <p className="nm-next nm-st st-in"><Bi {...c.next} /></p> : <span className="st-in" />}
      </div>
      <div className="nm-foot st-pad">
        <button type="button" className="nm-cta on-ac st-in" onClick={onAgain}>
          <span className="nm-st"><Bi {...c.again} /></span>
          <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
        </button>
        <button type="button" className="nm-ghost st-in" onClick={home} disabled={leaving} aria-busy={leaving || undefined}>
          <Bi k="backToToday" />
        </button>
      </div>
    </div>
  )
}
