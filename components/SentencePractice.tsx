'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FillBlankQuestion, DialogueQuestion, TranslationQuestion, SentencePracticeQuestion } from '@/app/api/sentences/generate/route'

interface Props {
  setId: string
  questions: SentencePracticeQuestion[]
  direction?: 'it-en' | 'en-it'
}

function FormatPill({ type }: { type: string }) {
  const styles: Record<string, string> = {
    fill_blank:  'bg-blue-100 text-blue-800',
    dialogue:    'bg-green-100 text-green-800',
    translation: 'bg-yellow-100 text-yellow-800',
  }
  const labels: Record<string, string> = {
    fill_blank:  'Fill in the blank',
    dialogue:    'Dialogue',
    translation: 'Translation',
  }
  return (
    <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${styles[type] ?? ''}`}>
      {labels[type] ?? type}
    </span>
  )
}

function optionClass(opt: string, selected: string | null, correct: string): string {
  const base = 'w-full border-2 rounded-xl px-4 py-2.5 text-sm font-medium text-left transition-colors'
  if (!selected) return `${base} border-qz-border text-qz-text bg-white cursor-pointer hover:border-qz-blue hover:text-qz-blue`
  if (opt === correct)   return `${base} border-green-500 text-green-700 bg-green-50 cursor-default`
  if (opt === selected)  return `${base} border-red-500 text-red-700 bg-red-50 cursor-default`
  return `${base} border-qz-border text-qz-secondary bg-white opacity-50 cursor-default`
}

function FeedbackBar({ correct, grammarNote, onNext }: { correct: boolean; grammarNote?: string; onNext: () => void }) {
  return (
    <div className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold mt-2 ${
      correct ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      <span>{correct ? '✓ Correct!' : '✗ Incorrect'}</span>
      {grammarNote && <em className="font-normal ml-1">{grammarNote}</em>}
      <button
        onClick={onNext}
        className="ml-auto bg-qz-blue text-white text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-qz-blue-dark transition-colors whitespace-nowrap"
      >
        Next →
      </button>
    </div>
  )
}

function FillBlankView({ q, selected, onAnswer, onNext }: {
  q: FillBlankQuestion; selected: string | null; onAnswer: (o: string) => void; onNext: () => void
}) {
  const parts = q.italian.split('___')
  return (
    <>
      <FormatPill type="fill_blank" />
      <div className="text-xl font-semibold text-qz-text leading-relaxed mt-2 mb-1 text-center">
        {parts[0]}
        <span className="inline-block min-w-[80px] h-7 border-b-2 border-qz-blue bg-qz-blue-light rounded-t mx-1 align-middle" />
        {parts[1]}
      </div>
      <p className="text-sm text-qz-muted italic mb-5">{q.english}</p>
      <div className="grid grid-cols-2 gap-2.5 mb-2 w-full">
        {q.options.map(opt => (
          <button
            key={opt}
            onClick={() => !selected && onAnswer(opt)}
            disabled={!!selected}
            className={optionClass(opt, selected, q.blankWord) + ' text-center'}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected && (
        <FeedbackBar correct={selected === q.blankWord} grammarNote={q.grammarNote} onNext={onNext} />
      )}
    </>
  )
}

function DialogueView({ q, selected, onAnswer, onNext, translationsVisible, onToggleTranslations }: {
  q: DialogueQuestion; selected: string | null; onAnswer: (o: string) => void; onNext: () => void
  translationsVisible: boolean; onToggleTranslations: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between w-full mb-3">
        <FormatPill type="dialogue" />
        <button
          onClick={onToggleTranslations}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors cursor-pointer ${
            translationsVisible ? 'bg-qz-blue-light text-qz-blue' : 'bg-qz-subtle text-qz-secondary hover:bg-qz-border'
          }`}
        >
          👁 {translationsVisible ? 'Hide translations' : 'Show translations'}
        </button>
      </div>

      <div className="bg-qz-subtle border border-qz-border rounded-xl p-4 w-full mb-4 text-left">
        {q.lines.map((line, i) => (
          <div key={i} className={`flex gap-2.5 ${i < q.lines.length - 1 ? 'mb-3' : ''}`}>
            <span className="text-xs font-bold text-qz-secondary uppercase tracking-wide min-w-[52px] pt-0.5 flex-shrink-0">
              {line.speaker}
            </span>
            <div>
              <p className="text-sm text-qz-text">{line.italian}</p>
              {translationsVisible && (
                <p className="text-xs text-qz-muted italic mt-0.5">{line.english}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-base font-semibold text-qz-text mb-1 w-full text-left">{q.question.italian}</p>
      {translationsVisible && (
        <p className="text-xs text-qz-muted italic mb-3 w-full text-left">{q.question.english}</p>
      )}
      {!translationsVisible && <div className="mb-3" />}

      <div className="flex flex-col gap-2 w-full mb-2">
        {q.options.map(opt => (
          <button
            key={opt}
            onClick={() => !selected && onAnswer(opt)}
            disabled={!!selected}
            className={optionClass(opt, selected, q.correct)}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected && (
        <FeedbackBar correct={selected === q.correct} onNext={onNext} />
      )}
    </>
  )
}

function TranslationView({ q, selected, onAnswer, onNext, direction }: {
  q: TranslationQuestion; selected: string | null; onAnswer: (o: string) => void; onNext: () => void
  direction: 'it-en' | 'en-it'
}) {
  const prompt  = direction === 'it-en' ? q.italian : q.english
  const hint    = direction === 'it-en' ? 'Choose the correct English translation ↓' : 'Choose the correct Italian translation ↓'
  const options = direction === 'it-en' ? q.options_en : q.options_it
  const correct = direction === 'it-en' ? q.correct_en : q.correct_it
  return (
    <>
      <FormatPill type="translation" />
      <p className="text-xl font-semibold text-qz-text mt-3 mb-1.5 w-full text-left">{prompt}</p>
      <p className="text-xs text-qz-muted mb-4 w-full text-left">{hint}</p>
      <div className="flex flex-col gap-2 w-full mb-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => !selected && onAnswer(opt)}
            disabled={!!selected}
            className={optionClass(opt, selected, correct)}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected && (
        <FeedbackBar correct={selected === correct} grammarNote={q.grammarNote} onNext={onNext} />
      )}
    </>
  )
}

export default function SentencePractice({ setId, questions, direction = 'it-en' }: Props) {
  const router = useRouter()
  const [index,               setIndex]        = useState(0)
  const [selected,            setSelected]     = useState<string | null>(null)
  const [translationsVisible, setTranslations] = useState(false)
  const [score,               setScore]        = useState(0)
  const [done,                setDone]         = useState(false)

  const q = questions[index]

  function isCorrectAnswer(option: string): boolean {
    if (q.type === 'fill_blank')  return option === q.blankWord
    if (q.type === 'dialogue')    return option === q.correct
    if (q.type === 'translation') {
      const correct = direction === 'it-en' ? q.correct_en : q.correct_it
      return option === correct
    }
    return false
  }

  function handleAnswer(option: string) {
    if (selected) return
    setSelected(option)
    if (isCorrectAnswer(option)) setScore(s => s + 1)
  }

  function next() {
    setSelected(null)
    setTranslations(false)
    if (index + 1 >= questions.length) setDone(true)
    else setIndex(i => i + 1)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <p className="text-lg text-qz-secondary">
          <span className="font-bold text-qz-blue">{score}</span> / {questions.length} correct
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setSelected(null); setScore(0); setDone(false) }}
            className="px-6 py-2.5 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push(`/sets/${setId}`)}
            className="px-6 py-2.5 border-2 border-qz-border rounded-full text-qz-secondary font-medium hover:border-qz-blue hover:text-qz-blue cursor-pointer transition-colors"
          >
            Back to Set
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-sm text-qz-secondary mb-2">
          <span>Question {index + 1} of {questions.length}</span>
          <span className="text-qz-blue font-medium">{score} correct</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5">
          <div
            className="bg-qz-blue h-1.5 rounded-full transition-all"
            style={{ width: `${(index / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div
        className="w-full max-w-sm bg-white border-2 border-qz-border rounded-2xl p-6 flex flex-col items-center"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
      >
        {q.type === 'fill_blank' && (
          <FillBlankView q={q} selected={selected} onAnswer={handleAnswer} onNext={next} />
        )}
        {q.type === 'dialogue' && (
          <DialogueView
            q={q}
            selected={selected}
            onAnswer={handleAnswer}
            onNext={next}
            translationsVisible={translationsVisible}
            onToggleTranslations={() => setTranslations(v => !v)}
          />
        )}
        {q.type === 'translation' && (
          <TranslationView q={q} selected={selected} onAnswer={handleAnswer} onNext={next} direction={direction} />
        )}
      </div>
    </div>
  )
}
