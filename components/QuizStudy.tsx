'use client'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '@/lib/types'
import { buildQuestions, italianOf, type ChoiceQuestion, type Direction, type BackLink } from '@/lib/study'
import { saveProgress } from '@/lib/progress-client'
import { reducedMotion, tokenMs } from '@/lib/motion'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import ChoiceList from './ChoiceList'
import { SpeakOrb } from './Speak'
import Bi from './Bi'

const ADVANCE_MS = 1200

interface Props {
  /** Built on the server (lib/study.ts buildQuestions) so hydration matches. */
  questions: ChoiceQuestion[]
  /** The topic's enabled cards, to deal fresh questions for "Rifai il quiz". */
  cards: Card[]
  back: BackLink
  direction?: Direction
}

/** Quiz: four options per word, answers in the bottom third, auto-advancing 1.2s after a pick. */
export default function QuizStudy({ questions: initial, cards, back, direction = 'it-en' }: Props) {
  const [questions, setQuestions] = useState(initial)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [swap, setSwap] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  const q = questions[index]

  function pick(k: number) {
    if (picked != null) return
    setPicked(k)
    const right = k === q.correctIndex
    if (right) setScore(s => s + 1)
    saveProgress(q.card.id, right)
    later(() => {
      if (index + 1 >= questions.length) { setDone(true); return }
      setSwap(true)
      later(() => {
        setIndex(i => i + 1)
        setPicked(null)
        setSwap(false)
      }, reducedMotion() ? 0 : tokenMs('--d-small', 250))
    }, ADVANCE_MS)
  }

  function again() {
    setQuestions(buildQuestions(cards, initial.length))
    setIndex(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  if (done) {
    return (
      <SessionComplete
        mode="quiz"
        result={{ right: score, wrong: questions.length - score, total: questions.length }}
        back={back}
        onAgain={again}
      />
    )
  }

  const italian = italianOf(q.card)
  const toEnglish = direction === 'it-en'
  return (
    <div className="st-view">
      <StudyTop
        back={back}
        count={<span className="tab-n nm-x"><Bi it="Quiz" en="Quiz" /> · {index + 1} / {questions.length}</span>}
        progress={(index + (picked != null ? 1 : 0)) / questions.length}
      />
      <div className={`q-body st-pad${swap ? ' swap' : ''}`}>
        <div className="nm-q">
          <small className="nm-st"><Bi it="Che cosa significa?" en="What does it mean?" /></small>
          {toEnglish
            ? <span className="w ser" lang="it">{italian}</span>
            : <span className="w sans">{q.card.english}</span>}
          {(toEnglish || picked != null) && <SpeakOrb text={italian} />}
        </div>
        <div className={`q-timer${picked != null ? ' run' : ''}`} aria-hidden="true"><i /></div>
        <ChoiceList
          key={index}
          className="nm-opts nm-x"
          choices={q.options.map(o => toEnglish
            ? { key: o.id, label: o.english }
            : { key: o.id, label: italianOf(o), lang: 'it' })}
          correct={q.correctIndex}
          picked={picked}
          onPick={pick}
        />
      </div>
    </div>
  )
}
