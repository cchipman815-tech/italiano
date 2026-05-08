'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'
import SpeakButton from '@/components/SpeakButton'
import GenderBadge from '@/components/GenderBadge'

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
  const [deck] = useState(() => shuffleArray(cards.filter(c => c.enabled !== false)))
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
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <div className="flex gap-8 text-lg">
          <div className="text-qz-blue font-semibold">✓ {knownCount} known</div>
          <div className="text-red-600 font-semibold">✗ {unknownCount} unknown</div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setDone(false) }}
            className="px-6 py-2.5 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors"
          >
            Study Again
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
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-sm text-qz-secondary mb-3">
          <span>{index + 1} / {deck.length}</span>
          <span className="text-qz-blue font-medium">{Object.values(results).filter(Boolean).length} known</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5 mb-6">
          <div
            className="bg-qz-blue h-1.5 rounded-full transition-all"
            style={{ width: `${(index / deck.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-2xl bg-white border-2 border-qz-border rounded-2xl cursor-pointer select-none min-h-[300px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
        onClick={() => setFlipped(f => !f)}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-3">
          {!flipped ? (
            <>
              <div className="flex items-center gap-2 justify-center">
                <div className="text-3xl font-bold text-qz-text">{currentCard.italian}</div>
                <GenderBadge gender={currentCard.gender} />
                <SpeakButton text={currentCard.italian} />
              </div>
              <div className="text-sm text-qz-secondary">click or press space to flip</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 justify-center">
                <div className="text-sm text-qz-secondary mb-1">{currentCard.italian}</div>
                <GenderBadge gender={currentCard.gender} size="sm" />
                <SpeakButton text={currentCard.italian} size="sm" />
              </div>
              <div className="text-3xl font-bold text-qz-text">{currentCard.english}</div>
              {currentCard.conjugations?.present && (
                <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-1 text-sm text-qz-secondary border-t border-qz-border pt-4 w-full max-w-xs">
                  {(['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'] as const).map(pronoun => (
                    <div key={pronoun} className="flex gap-1">
                      <span className="text-qz-secondary text-xs mt-0.5">{pronoun}</span>
                      <span className="font-semibold text-qz-text">{currentCard.conjugations!.present![pronoun]}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {/* Quizlet-style "click to flip" bar */}
        <div className="bg-qz-blue text-white text-sm font-semibold text-center py-3 select-none">
          Click the card to flip
        </div>
      </div>

      {flipped && (
        <div className="flex gap-4">
          <button
            onClick={() => advance(false)}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors cursor-pointer"
          >
            ✗ Don&apos;t know
          </button>
          <button
            onClick={() => advance(true)}
            className="px-8 py-3 bg-qz-blue text-white font-semibold rounded-full hover:bg-qz-blue-dark transition-colors cursor-pointer"
          >
            ✓ Got it
          </button>
        </div>
      )}
      {!flipped && (
        <p className="text-xs text-qz-secondary">← → arrow keys to answer after flipping</p>
      )}
    </div>
  )
}
