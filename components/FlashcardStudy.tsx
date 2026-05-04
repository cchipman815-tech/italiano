'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'

interface Props {
  setId: string
  cards: Card[]
  initialProgress: Record<string, boolean>
}

async function saveProgress(cardId: string, known: boolean) {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, known }),
  })
}

export default function FlashcardStudy({ setId, cards, initialProgress }: Props) {
  const router = useRouter()
  const [deck] = useState(() => shuffleArray(cards))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>(initialProgress)
  const [done, setDone] = useState(false)

  const currentCard = deck[index]

  const advance = useCallback((known: boolean) => {
    saveProgress(currentCard.id, known)
    setResults(prev => ({ ...prev, [currentCard.id]: known }))
    setFlipped(false)
    if (index + 1 >= deck.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }, [currentCard, index, deck.length])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFlipped(f => !f)
      } else if (e.key === 'ArrowRight' && flipped) {
        advance(true)
      } else if (e.key === 'ArrowLeft' && flipped) {
        advance(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, advance])

  if (done) {
    const knownCount = Object.values(results).filter(Boolean).length
    const unknownCount = deck.length - knownCount
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Session Complete!</h2>
        <div className="flex gap-8 text-lg">
          <div className="text-green-600 font-semibold">✓ {knownCount} known</div>
          <div className="text-red-500 font-semibold">✗ {unknownCount} unknown</div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setDone(false) }}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 cursor-pointer"
          >
            Study Again
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
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span>Card {index + 1} of {deck.length}</span>
          <span className="text-green-600">{Object.values(results).filter(Boolean).length} known</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${(index / deck.length) * 100}%` }}
          />
        </div>
      </div>

      <div
        className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl p-12 text-center cursor-pointer select-none hover:shadow-md transition-shadow min-h-[200px] flex flex-col items-center justify-center gap-3"
        onClick={() => setFlipped(f => !f)}
      >
        {!flipped ? (
          <>
            <div className="text-3xl font-bold text-gray-900">{currentCard.italian}</div>
            <div className="text-sm text-gray-400">click or press space to flip</div>
          </>
        ) : (
          <>
            <div className="text-sm text-gray-400 mb-1">{currentCard.italian}</div>
            <div className="text-3xl font-bold text-gray-900">{currentCard.english}</div>
          </>
        )}
      </div>

      {flipped && (
        <div className="flex gap-4">
          <button
            onClick={() => advance(false)}
            className="px-8 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
          >
            ✗ Don&apos;t know
          </button>
          <button
            onClick={() => advance(true)}
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
          >
            ✓ Got it
          </button>
        </div>
      )}
      {!flipped && (
        <p className="text-xs text-gray-400">← → arrow keys to answer after flipping</p>
      )}
    </div>
  )
}
