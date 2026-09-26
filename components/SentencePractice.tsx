'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DialogueQuestion, FillBlankQuestion, SentencePracticeQuestion, TranslationQuestion } from '@/app/api/sentences/generate/route'
import type { Bilingual } from '@/lib/paths'
import type { BackLink, Direction } from '@/lib/study'
import { reducedMotion, tokenMs } from '@/lib/motion'
import { shuffleArray } from '@/lib/utils'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import ChoiceList from './ChoiceList'
import { Icon } from './StudyIcons'
import Bi from './Bi'

interface Props {
  setId: string
  back: BackLink
  direction?: Direction
}

/** A question ready to show: its options in a fixed, shuffled order. */
interface Prepared {
  q: SentencePracticeQuestion
  options: string[]
  correct: number
}

function prepare(q: SentencePracticeQuestion, direction: Direction): Prepared {
  let options: string[]
  let right: string
  if (q.type === 'fill_blank') { options = q.options; right = q.blankWord }
  else if (q.type === 'dialogue') { options = q.options; right = q.correct }
  else if (direction === 'it-en') { options = q.options_en; right = q.correct_en }
  else { options = q.options_it; right = q.correct_it }
  const shuffled = shuffleArray(options)
  return { q, options: shuffled, correct: shuffled.indexOf(right) }
}

/**
 * One request per topic at a time: generating writes the topic's sentences,
 * so a second mount (React's dev double effects, a quick back-and-forth)
 * shares the request in flight instead of starting another.
 */
const inFlight = new Map<string, Promise<SentencePracticeQuestion[]>>()

function loadSentences(setId: string): Promise<SentencePracticeQuestion[]> {
  const pending = inFlight.get(setId)
  if (pending) return pending
  const request = fetch('/api/sentences/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setId }),
  })
    .then(async res => {
      const data = await res.json().catch(() => ({})) as { questions?: SentencePracticeQuestion[]; error?: string }
      if (!res.ok || !data.questions?.length) throw new Error(data.error ?? `HTTP ${res.status}`)
      return data.questions
    })
    .finally(() => inFlight.delete(setId))
  inFlight.set(setId, request)
  return request
}

const KIND: Record<SentencePracticeQuestion['type'], Bilingual> = {
  fill_blank: { it: 'Completa', en: 'Fill the blank' },
  dialogue: { it: 'Dialogo', en: 'Dialogue' },
  translation: { it: 'Traduci', en: 'Translate' },
}

function FillBlank({ q, answer }: { q: FillBlankQuestion; answer: string | null }) {
  const [before, after = ''] = q.italian.split('___')
  return (
    <>
      <p className="fq-s ser" lang="it">{before}<u>{answer ?? '___'}</u>{after}</p>
      <p className="fq-e">{q.english}</p>
    </>
  )
}

function Dialogue({ q, translated, onToggle }: { q: DialogueQuestion; translated: boolean; onToggle: () => void }) {
  const speakers = [...new Set(q.lines.map(l => l.speaker))]
  return (
    <>
      <div className={`fq-dlg${translated ? ' tr' : ''}`}>
        {q.lines.map((line, i) => (
          <div key={i} className={`fq-b${speakers.indexOf(line.speaker) % 2 ? ' r' : ''}`}>
            <em>{line.speaker}</em>
            <span lang="it">{line.italian}</span>
            <small>{line.english}</small>
          </div>
        ))}
      </div>
      <button type="button" className="nm-tog fq-tog" role="switch" aria-checked={translated} onClick={onToggle}>
        <span className="nm-x"><Bi it="Mostra traduzione" en="Show translation" /></span>
        <span className="nm-sw2" />
      </button>
      <p className="fq-s sm ser" lang="it">{q.question.italian}</p>
      {translated && <p className="fq-e">{q.question.english}</p>}
    </>
  )
}

function Translation({ q, direction }: { q: TranslationQuestion; direction: Direction }) {
  return direction === 'it-en' ? (
    <>
      <p className="fq-s ser" lang="it">{q.italian}</p>
      <p className="fq-e nm-st"><Bi it="Scegli la traduzione inglese" en="Choose the English translation" /></p>
    </>
  ) : (
    <>
      <p className="fq-s">{q.english}</p>
      <p className="fq-e nm-st"><Bi it="Scegli la traduzione italiana" en="Choose the Italian translation" /></p>
    </>
  )
}

/**
 * Frasi: generated sentences (fill the blank, dialogue, translation). They
 * load in the browser behind a skeleton; the first time takes a few seconds,
 * after that they come from the saved set. After each answer a feedback bar
 * rises with the grammar note and waits for Avanti.
 */
export default function SentencePractice({ setId, back, direction = 'it-en' }: Props) {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; questions: Prepared[] }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [barOpen, setBarOpen] = useState(false)
  const [translated, setTranslated] = useState(false)
  const [swap, setSwap] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const viewRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  useEffect(() => {
    let live = true
    loadSentences(setId)
      .then(questions => { if (live) setState({ status: 'ready', questions: questions.map(q => prepare(q, direction)) }) })
      .catch(err => { if (live) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }) })
    return () => { live = false }
  }, [setId, direction, attempt])

  const answered = picked != null
  // The body makes room for the feedback bar, so nothing hides under it.
  useLayoutEffect(() => {
    if (barOpen && barRef.current) viewRef.current?.style.setProperty('--fbh', `${barRef.current.offsetHeight}px`)
  }, [barOpen, index])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt(a => a + 1)
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="st-view">
        <StudyTop back={back} count={<span className="nm-x"><Bi it="Frasi" en="Sentences" /></span>} progress={0} />
        <div className="fq-load" role="status">
          <span className="nm-eb nm-x"><Bi it="Preparo le frasi…" en="Preparing sentences…" /></span>
          <i className="sk big" /><i className="sk w90" /><i className="sk w60" /><i className="sk w40" />
          <small className="nm-st"><Bi it="La prima volta ci vuole qualche secondo. Poi restano salvate." en="The first time takes a few seconds. After that they're saved." /></small>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="st-view">
        <StudyTop back={back} count={<span className="nm-x"><Bi it="Frasi" en="Sentences" /></span>} />
        <div className="nm-empty" role="alert">
          <span className="orb bad"><Icon name="alert" size={26} /></span>
          <h2 className="nm-x"><Bi it="Impossibile preparare le frasi" en="Unable to prepare sentences" /></h2>
          <p className="nm-st"><Bi k="somethingWrong" /></p>
          <button type="button" className="nm-ghost" onClick={retry}><Bi k="tryAgain" /></button>
        </div>
      </div>
    )
  }

  const questions = state.questions
  const { q, options, correct } = questions[index]

  function pick(k: number) {
    if (picked != null || swap) return
    setPicked(k)
    setBarOpen(true)
    if (k === correct) setScore(s => s + 1)
    later(() => nextRef.current?.focus({ preventScroll: true }), tokenMs('--d-medium', 400))
  }

  function next() {
    setBarOpen(false)
    if (index + 1 >= questions.length) {
      later(() => setDone(true), reducedMotion() ? 0 : tokenMs('--d-small', 250))
      return
    }
    setSwap(true)
    later(() => {
      setIndex(i => i + 1)
      setPicked(null)
      setTranslated(false)
      setSwap(false)
    }, reducedMotion() ? 0 : tokenMs('--d-small', 250))
  }

  function again() {
    setState({ status: 'ready', questions: questions.map(p => prepare(p.q, direction)) })
    setIndex(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  if (done) {
    return (
      <SessionComplete
        mode="sentences"
        result={{ right: score, wrong: questions.length - score, total: questions.length }}
        back={back}
        onAgain={again}
      />
    )
  }

  const right = picked === correct
  const note = q.type !== 'dialogue' ? q.grammarNote : null
  const italianOptions = q.type !== 'translation' || direction === 'en-it'

  return (
    <div ref={viewRef} className={`st-view fq-view${barOpen ? ' fb-on' : ''}`}>
      <StudyTop
        back={back}
        count={<span className="tab-n nm-x"><Bi it="Frasi" en="Sentences" /> · {index + 1} / {questions.length}</span>}
        progress={(index + (answered ? 1 : 0)) / questions.length}
      />
      <div className={`fq-body st-pad${swap ? ' swap' : ''}`}>
        <div className="fq-q">
          <span className="fq-kind nm-x"><Bi {...KIND[q.type]} /></span>
          {q.type === 'fill_blank' && <FillBlank q={q} answer={answered ? options[correct] : null} />}
          {q.type === 'dialogue' && <Dialogue q={q} translated={translated} onToggle={() => setTranslated(t => !t)} />}
          {q.type === 'translation' && <Translation q={q} direction={direction} />}
        </div>
        <ChoiceList
          key={index}
          className={`nm-opts fq-opts nm-x${q.type === 'fill_blank' ? ' g2' : ''}`}
          choices={options.map(o => ({ key: o, label: o, lang: italianOptions ? 'it' : undefined }))}
          correct={correct}
          picked={picked}
          onPick={pick}
        />
      </div>

      <div ref={barRef} className={`fq-fb${answered ? ` ${right ? 'ok' : 'no'}` : ''}${barOpen ? ' on' : ''}`} inert={!barOpen}>
        <div className="h">
          <Icon name={right ? 'check' : 'x'} size={20} strokeWidth={2.6} />
          <span className="nm-x">{right ? <Bi it="Giusto" en="Correct" /> : <Bi it="Non proprio" en="Not quite" />}</span>
        </div>
        {(note || (answered && !right)) && (
          <p>
            {!right && <><span className="nm-x"><Bi it="Risposta giusta" en="Right answer" /></span>: <b lang={italianOptions ? 'it' : undefined}>{options[correct]}</b>{note ? ' · ' : ''}</>}
            {note}
          </p>
        )}
        <button ref={nextRef} type="button" className="nm-cta on-ac" onClick={next}>
          <span className="nm-st"><Bi k="next" /></span>
          <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
        </button>
      </div>
    </div>
  )
}
