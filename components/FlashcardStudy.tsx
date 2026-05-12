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
  direction?: 'it-en' | 'en-it'
}

async function saveProgress(cardId: string, known: boolean) {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, known }),
  })
}

function WordTypePill({ card }: { card: Card }) {
  const label = card.word_type
    ? card.word_type.charAt(0).toUpperCase() + card.word_type.slice(1)
    : null
  const chapterLabel = card.chapter ? `Ch. ${card.chapter}` : null
  if (!label && !chapterLabel) return null
  return (
    <span className="text-xs font-bold uppercase tracking-wide bg-qz-subtle text-qz-secondary px-2.5 py-0.5 rounded-full">
      {label}{label && chapterLabel ? ` · ${chapterLabel}` : chapterLabel}
    </span>
  )
}

function TensePill({ tense }: { tense?: string | null }) {
  if (!tense) return null
  return (
    <span className="text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
      {tense.charAt(0).toUpperCase() + tense.slice(1)}
    </span>
  )
}

function NounMeta({ card }: { card: Card }) {
  if (!card.article && !card.gender && !card.plural) return null
  return (
    <div className="flex items-center gap-2 text-sm text-qz-secondary flex-wrap justify-center mt-1">
      <GenderBadge gender={card.gender} />
      {card.article && (
        <span className="font-medium text-qz-text">{card.article} {card.italian}</span>
      )}
      {card.plural && (
        <span className="text-qz-muted">· pl. <span className="font-medium text-qz-text">{card.plural}</span></span>
      )}
    </div>
  )
}

function VerbConjugations({ card }: { card: Card }) {
  const present = card.conjugations?.present
  if (!present) return null
  const left:  (keyof typeof present)[] = ['io', 'tu', 'lui/lei']
  const right: (keyof typeof present)[] = ['noi', 'voi', 'loro']
  return (
    <div className="mt-3 w-full max-w-xs border-t border-qz-border pt-3">
      <p className="text-xs text-qz-muted uppercase tracking-wide font-semibold mb-2 text-center">
        Conjugation — {card.tense ? card.tense.charAt(0).toUpperCase() + card.tense.slice(1) : 'Present'}
      </p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        {left.map((p, i) => (
          <div key={p} className="contents">
            <div className="flex gap-1.5 items-baseline">
              <span className="text-qz-secondary text-xs w-12 text-right flex-shrink-0">{p}</span>
              <span className="font-semibold text-qz-text">{present[p]}</span>
            </div>
            <div className="flex gap-1.5 items-baseline">
              <span className="text-qz-secondary text-xs w-12 text-right flex-shrink-0">{right[i]}</span>
              <span className="font-semibold text-qz-text">{present[right[i]]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdjectiveForms({ card }: { card: Card }) {
  const f = card.adjective_forms
  if (!f) return null
  return (
    <div className="mt-3 w-full max-w-xs border-t border-qz-border pt-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(['ms', 'fs', 'mp', 'fp'] as const).map(key => (
          <div key={key} className="flex flex-col items-center bg-qz-subtle rounded-lg py-1.5 px-2">
            <span className="text-xs text-qz-muted uppercase tracking-wide">{key}</span>
            <span className="font-semibold text-qz-text">{f[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExampleBlock({ example }: { example: { italian: string; english: string } }) {
  return (
    <div className="mt-3 border-t border-qz-border pt-3 w-full max-w-sm text-left">
      <p className="text-xs text-qz-muted uppercase tracking-wide font-semibold mb-1">Example</p>
      <div className="flex items-start gap-1">
        <p className="text-sm text-qz-text italic flex-1">{example.italian}</p>
        <SpeakButton text={example.italian} size="sm" />
      </div>
      <p className="text-xs text-qz-secondary mt-0.5">{example.english}</p>
    </div>
  )
}

export default function FlashcardStudy({ setId, cards, initialProgress, direction = 'it-en' }: Props) {
  const router = useRouter()
  const [deck]    = useState(() => shuffleArray(cards.filter(c => c.enabled !== false)))
  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>(initialProgress)
  const [done,    setDone]    = useState(false)

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
    const knownCount   = Object.values(results).filter(Boolean).length
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

  const frontWord   = direction === 'it-en' ? currentCard.italian : currentCard.english
  const backWord    = direction === 'it-en' ? currentCard.english : currentCard.italian
  const isVerb      = currentCard.word_type === 'verb'
  const isNoun      = currentCard.word_type === 'noun'
  const isAdjective = currentCard.word_type === 'adjective'

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-sm text-qz-secondary mb-3">
          <span>{index + 1} / {deck.length}</span>
          <span className="text-qz-blue font-medium">{Object.values(results).filter(Boolean).length} known</span>
        </div>
        <div className="w-full bg-qz-subtle rounded-full h-1.5 mb-4">
          <div
            className="bg-qz-blue h-1.5 rounded-full transition-all"
            style={{ width: `${(index / deck.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-2xl bg-white border-2 border-qz-border rounded-2xl select-none min-h-[340px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-3">
          {!flipped ? (
            /* FRONT */
            <>
              <div className="flex gap-1.5 flex-wrap justify-center">
                <WordTypePill card={currentCard} />
                {isVerb && <TensePill tense={currentCard.tense} />}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="text-3xl font-bold text-qz-text">{frontWord}</div>
                {direction === 'it-en' && <SpeakButton text={currentCard.italian} />}
              </div>
            </>
          ) : (
            /* BACK */
            <>
              {/* Italian reminder with speaker */}
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-sm text-qz-secondary">{currentCard.italian}</span>
                <SpeakButton text={currentCard.italian} size="sm" />
              </div>

              {/* Main translation */}
              <div className="text-3xl font-bold text-qz-text">{backWord}</div>

              {/* Type-specific content */}
              {isNoun      && <NounMeta card={currentCard} />}
              {isVerb      && <VerbConjugations card={currentCard} />}
              {isAdjective && <AdjectiveForms card={currentCard} />}

              {/* Example sentence */}
              {currentCard.example && <ExampleBlock example={currentCard.example} />}
            </>
          )}
        </div>

        {/* Bottom bar — flip trigger OR answer buttons */}
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="bg-qz-blue text-white text-sm font-semibold text-center py-3 cursor-pointer w-full hover:bg-qz-blue-dark transition-colors"
          >
            Tap to flip
          </button>
        ) : (
          <div className="flex border-t-2 border-qz-border">
            <button
              onClick={() => advance(false)}
              className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left pl-5"
            >
              ← Don&apos;t know
            </button>
            <div className="w-0.5 bg-qz-border" />
            <button
              onClick={() => advance(true)}
              className="flex-1 py-3 text-sm font-bold text-qz-blue hover:bg-qz-blue-light transition-colors cursor-pointer text-right pr-5"
            >
              Got it →
            </button>
          </div>
        )}
      </div>

      {!flipped && (
        <p className="text-xs text-qz-secondary">press space to flip · ← → arrow keys to answer after flipping</p>
      )}
    </div>
  )
}
