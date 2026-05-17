'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'
import SpeakButton from '@/components/SpeakButton'

interface ConjugationItem {
  verbItalian: string
  verbEnglish: string
  pronoun: string
  italianForm: string
  englishMeaning: string
}

const PRONOUN_TEMPLATES: Array<{ pronoun: string; enTemplate: (base: string) => string }> = [
  { pronoun: 'io',      enTemplate: base => `I ${base}` },
  { pronoun: 'tu',      enTemplate: base => `you ${base}` },
  { pronoun: 'lui/lei', enTemplate: base => `he/she ${base}` },
  { pronoun: 'noi',     enTemplate: base => `we ${base}` },
  { pronoun: 'voi',     enTemplate: base => `you all ${base}` },
  { pronoun: 'loro',    enTemplate: base => `they ${base}` },
]

function verbBase(english: string): string {
  return english.trim().toLowerCase().replace(/^to\s+/, '')
}

function buildDeck(cards: Card[]): ConjugationItem[] {
  const items: ConjugationItem[] = []
  for (const card of cards.filter(c => c.enabled !== false)) {
    const present = card.conjugations?.present
    if (!present) continue
    const base = verbBase(card.english)
    const verbEnglish = card.english.trim().toLowerCase().startsWith('to ')
      ? card.english
      : `to ${card.english}`
    for (const { pronoun, enTemplate } of PRONOUN_TEMPLATES) {
      const italianForm = present[pronoun as keyof typeof present]
      if (!italianForm) continue
      items.push({
        verbItalian:    card.italian,
        verbEnglish,
        pronoun,
        italianForm,
        englishMeaning: enTemplate(base),
      })
    }
  }
  return shuffleArray(items)
}

interface Props {
  setId: string
  cards: Card[]
  direction?: 'it-en' | 'en-it'
}

export default function ConjugationStudy({ setId, cards, direction = 'it-en' }: Props) {
  const router = useRouter()
  const [deck, setDeck] = useState(() => buildDeck(cards))
  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [score,   setScore]   = useState(0)
  const [done,    setDone]    = useState(false)

  const current = deck[index]

  const advance = useCallback((known: boolean) => {
    if (known) setScore(s => s + 1)
    setFlipped(false)
    if (index + 1 >= deck.length) setDone(true)
    else setIndex(i => i + 1)
  }, [index, deck.length])

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

  if (deck.length === 0) {
    return (
      <div className="text-center py-16 text-qz-secondary">
        No conjugation cards available.
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-qz-text">Session Complete!</h2>
        <div className="flex gap-8 text-lg">
          <div className="text-qz-blue font-semibold">✓ {score} known</div>
          <div className="text-red-600 font-semibold">✗ {deck.length - score} unknown</div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setDeck(buildDeck(cards)); setIndex(0); setFlipped(false); setScore(0); setDone(false) }}
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

  const frontWord    = direction === 'it-en'
    ? `(${current.pronoun}) ${current.italianForm}`
    : current.englishMeaning
  const backWord     = direction === 'it-en'
    ? current.englishMeaning
    : `(${current.pronoun}) ${current.italianForm}`
  const verbPillFront = `${current.verbItalian} · verb`
  const verbPillBack  = `${current.verbItalian} — ${current.verbEnglish}`

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-sm text-qz-secondary mb-3">
          <span>{index + 1} / {deck.length}</span>
          <span className="text-qz-blue font-medium">{score} known</span>
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
        className="w-full max-w-2xl bg-white border-2 border-qz-border rounded-2xl select-none min-h-[280px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--qz-shadow-card)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-3">
          {!flipped ? (
            <>
              <span className="text-xs font-bold uppercase tracking-wide bg-qz-blue-light text-qz-blue px-3 py-1 rounded-full">
                {verbPillFront}
              </span>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl font-bold text-qz-text">{frontWord}</span>
                {direction === 'it-en' && <SpeakButton text={current.italianForm} />}
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-bold uppercase tracking-wide bg-qz-blue-light text-qz-blue px-3 py-1 rounded-full">
                {verbPillBack}
              </span>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-sm text-qz-secondary">{frontWord}</span>
                {direction === 'it-en' && <SpeakButton text={current.italianForm} size="sm" />}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl font-bold text-qz-text">{backWord}</span>
                {direction === 'en-it' && <SpeakButton text={current.italianForm} />}
              </div>
            </>
          )}
        </div>

        {/* Bottom bar */}
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
