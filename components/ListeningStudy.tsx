'use client'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '@/lib/types'
import { buildQuestions, italianOf, type ChoiceQuestion, type BackLink } from '@/lib/study'
import { saveProgress } from '@/lib/progress-client'
import { plainText } from '@/lib/i18n'
import { reducedMotion, tokenMs } from '@/lib/motion'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import ChoiceList from './ChoiceList'
import { speak, stopSpeaking, useSpeechStatus } from './Speak'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Bi from './Bi'

const ADVANCE_MS = 1800

interface Props {
  /** Built on the server (lib/study.ts buildQuestions) so hydration matches. */
  questions: ChoiceQuestion[]
  /** The topic's enabled cards, to deal fresh questions for "Riascolta". */
  cards: Card[]
  back: BackLink
}

/** Replays a word from the start, even while it's still playing. */
function replay(text: string) {
  stopSpeaking()
  void speak(text)
}

/**
 * Ascolto: hear an Italian word, pick its meaning. Audio needs a gesture on
 * phones, so the session opens on a "tap to start" screen; after that each
 * word plays on its own, and the Italian appears once you've answered.
 */
export default function ListeningStudy({ questions: initial, cards, back }: Props) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const [questions, setQuestions] = useState(initial)
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [swap, setSwap] = useState(false)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const playRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])

  const q = questions[index]
  const italian = italianOf(q.card)
  const status = useSpeechStatus(italian)

  useEffect(() => {
    const pending = timers.current
    return () => { pending.forEach(clearTimeout); stopSpeaking() }
  }, [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  function start() {
    setStarted(true)
    replay(italian)
    requestAnimationFrame(() => playRef.current?.focus({ preventScroll: true }))
  }

  function pick(k: number) {
    if (picked != null) return
    setPicked(k)
    const right = k === q.correctIndex
    if (right) setScore(s => s + 1)
    else setMissed(m => [...m, italian])
    saveProgress(q.card.id, right)
    later(() => {
      if (index + 1 >= questions.length) { stopSpeaking(); setDone(true); return }
      setSwap(true)
      later(() => {
        setIndex(i => i + 1)
        setPicked(null)
        setSwap(false)
        replay(italianOf(questions[index + 1].card))
      }, reducedMotion() ? 0 : tokenMs('--d-small', 250))
    }, ADVANCE_MS)
  }

  function again() {
    const next = buildQuestions(cards, initial.length)
    setQuestions(next)
    setIndex(0)
    setPicked(null)
    setScore(0)
    setMissed([])
    setDone(false)
    replay(italianOf(next[0].card))
  }

  if (done) {
    return (
      <SessionComplete
        mode="listening"
        result={{ right: score, wrong: missed.length, total: questions.length, missed }}
        back={back}
        onAgain={again}
      />
    )
  }

  const count = <span className="tab-n nm-x"><Bi it="Ascolto" en="Listening" /> · {index + 1} / {questions.length}</span>

  if (!started) {
    return (
      <div className="st-view">
        <StudyTop back={back} count={count} progress={0} />
        <div className="as-start">
          <span className="as-orb"><Icon name="ear" size={34} strokeWidth={1.6} /></span>
          <h1 className="ser as-title nm-st"><Bi it="Ascolta e scegli" en="Listen and choose" /></h1>
          <p className="nm-st"><Bi it="Senti una parola in italiano e scegli che cosa vuol dire." en="Hear a word in Italian, then choose what it means." /></p>
          <small className="nm-x"><Bi it="L'audio parte dopo il primo tocco." en="Audio starts after your first tap." /></small>
        </div>
        <div className="nm-foot st-pad">
          <button type="button" className="nm-cta on-ac" onClick={start}>
            <span className="nm-st"><Bi k="start" /></span>
            <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="st-view">
      <StudyTop back={back} count={count} progress={(index + (picked != null ? 1 : 0)) / questions.length} />
      <div className={`q-body st-pad${swap ? ' swap' : ''}`}>
        <div className="as-q">
          <button
            ref={playRef}
            type="button"
            className={`as-play${status === 'playing' ? ' on' : ''}`}
            aria-label={plainText({ it: 'Riascolta la parola', en: 'Play the word again' }, imm)}
            aria-busy={status === 'loading' || undefined}
            onClick={() => replay(italian)}
          >
            <Icon name="speak" size={40} strokeWidth={1.6} />
          </button>
          <small className="nm-x"><Bi it="Che cosa senti?" en="What do you hear?" /></small>
          <span className={`as-word ser${picked != null ? ' show' : ''}`} lang="it" aria-live="polite">
            {picked != null ? italian : ''}
          </span>
        </div>
        <div className={`q-timer long${picked != null ? ' run' : ''}`} aria-hidden="true"><i /></div>
        <ChoiceList
          key={index}
          className="as-opts nm-x"
          choices={q.options.map(o => ({ key: o.id, label: o.english }))}
          correct={q.correctIndex}
          picked={picked}
          onPick={pick}
        />
      </div>
    </div>
  )
}
