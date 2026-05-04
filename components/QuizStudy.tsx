'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'
import { selectDistractors } from '@/lib/quiz'

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

export default function QuizStudy({ setId, cards }: Props) {
  const router = useRouter()
  const questionCount = Math.min(cards.length, 20)
  const [questions] = useState(() => buildQuestions(cards, questionCount))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const current = questions[index]

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
        setIndex(i => i + 1)
      }
    }, 1200)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">📝</div>
        <h2 className="text-2xl font-bold text-gray-900">Quiz Complete!</h2>
        <div className="text-3xl font-bold text-green-600">{score} / {questions.length}</div>
        <p className="text-gray-500">{Math.round((score / questions.length) * 100)}% correct</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setIndex(0); setScore(0); setSelected(null); setDone(false) }}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 cursor-pointer"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => router.push(`/sets/${setId}`)}
            className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Back to Set
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Question {index + 1} of {questions.length}</span>
        <span className="text-green-600 font-medium">Score: {score}/{index}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-400 mb-2">What does this mean in English?</p>
        <p className="text-3xl font-bold text-gray-900">{current.card.italian}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {current.options.map((option, i) => {
          let cls = 'p-4 rounded-xl border text-center font-medium transition-colors '
          if (selected === null) {
            cls += 'bg-white border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer'
          } else if (i === current.correctIndex) {
            cls += 'bg-green-500 border-green-500 text-white'
          } else if (i === selected) {
            cls += 'bg-red-500 border-red-500 text-white'
          } else {
            cls += 'bg-white border-gray-200 opacity-50'
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
