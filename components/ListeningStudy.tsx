'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'
import { selectDistractors } from '@/lib/quiz'
import SpeakButton from '@/components/SpeakButton'

interface Question {
  card: Card
  options: Card[]
  correctIndex: number
}

function buildQuestions(cards: Card[], count: number): Question[] {
  const shuffled = shuffleArray(cards).slice(0, count)
  return shuffled.map(card => {
    const distractors = selectDistractors(cards, card, 3)
    const options = shuffleArray([card, ...distractors])
    return { card, options, correctIndex: options.findIndex(o => o.id === card.id) }
  })
}

async function saveProgress(cardId: string, known: boolean) {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, known }),
  })
}

interface Props {
  setId: string
  cards: Card[]
}

export default function ListeningStudy({ setId, cards }: Props) {
  const router = useRouter()
  const enabledCards = cards.filter(c => c.enabled !== false)
  const questionCount = Math.min(enabledCards.length, 20)
  const [questions] = useState(() => buildQuestions(enabledCards, questionCount))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const current = questions[index]

  // Play a card's audio. Called from the handlers that start, advance or restart
  // the session (not an effect), so playback also stays inside a user gesture.
  const playAudio = useCallback(async (text: string) => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setAudioLoading(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
      audioRef.current = audio
      audio.play()
      audio.onended = () => { audioRef.current = null }
    } finally {
      setAudioLoading(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  function handleSelect(optionIndex: number) {
    if (selected !== null) return
    setSelected(optionIndex)
    const isCorrect = optionIndex === current.correctIndex
    if (isCorrect) setScore(s => s + 1)
    saveProgress(current.card.id, isCorrect)
    setTimeout(() => {
      setSelected(null)
      if (index + 1 >= questions.length) {
        setDone(true)
      } else {
        setIndex(index + 1)
        playAudio(questions[index + 1].card.italian)
      }
    }, 1800)
  }

  // "Tap to start" screen — needed for mobile autoplay policy
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="text-6xl">🎧</div>
        <h2 className="text-2xl font-bold text-qz-text">Listening Mode</h2>
        <p className="text-qz-secondary max-w-xs">
          Italian audio will play automatically. Choose the correct English meaning.
        </p>
        <button
          onClick={() => { setStarted(true); playAudio(questions[0].card.italian) }}
          className="px-8 py-3 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors text-lg"
        >
          Start Listening
        </button>
      </div>
    )
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎧</div>
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <div className="text-3xl font-bold text-qz-blue">{score} / {questions.length}</div>
        <p className="text-qz-secondary">{pct}% correct</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setScore(0); setSelected(null); setDone(false); playAudio(questions[0].card.italian) }}
            className="px-6 py-2.5 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors"
          >
            Listen Again
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
    <div className="flex flex-col gap-6 py-6 max-w-xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-qz-secondary">
        <span>Question {index + 1} of {questions.length}</span>
        <span className="text-qz-blue font-semibold">Score: {score}/{index}</span>
      </div>
      <div className="w-full bg-qz-subtle rounded-full h-1.5">
        <div
          className="bg-qz-blue h-1.5 rounded-full transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      {/* Audio card */}
      <div
        className="bg-white border-2 border-qz-border rounded-2xl p-8 text-center"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
      >
        <p className="text-sm text-qz-secondary mb-4">What do you hear?</p>

        {/* Big replay button */}
        <button
          onClick={() => playAudio(current.card.italian)}
          disabled={audioLoading}
          className="w-20 h-20 rounded-full bg-qz-blue text-white flex items-center justify-center mx-auto hover:bg-qz-blue-dark transition-colors disabled:opacity-50 cursor-pointer"
          title="Play again"
        >
          {audioLoading ? (
            <span className="text-2xl animate-pulse">…</span>
          ) : (
            <span className="text-3xl">🔊</span>
          )}
        </button>

        {/* Reveal Italian word after answering */}
        {selected !== null && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="text-xl font-bold text-qz-text">{current.card.italian}</p>
            <SpeakButton text={current.card.italian} size="sm" />
          </div>
        )}
      </div>

      {/* Answer options */}
      <div className="grid grid-cols-2 gap-3">
        {current.options.map((option, i) => {
          let cls = 'p-5 rounded-2xl border-2 text-center font-semibold text-qz-text transition-all '
          if (selected === null) {
            cls += 'bg-white border-qz-border hover:border-qz-blue hover:bg-qz-blue-light cursor-pointer'
          } else if (i === current.correctIndex) {
            cls += 'bg-qz-blue border-qz-blue text-white'
          } else if (i === selected) {
            cls += 'bg-red-600 border-red-600 text-white'
          } else {
            cls += 'bg-white border-qz-border opacity-40'
          }
          return (
            <button key={option.id} onClick={() => handleSelect(i)} className={cls}>
              {option.english}
            </button>
          )
        })}
      </div>
    </div>
  )
}
