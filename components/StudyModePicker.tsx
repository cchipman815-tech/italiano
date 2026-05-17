'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  setId: string
  canStudyMulti: boolean
  dueCount: number
  hasConjugations: boolean
}

export default function StudyModePicker({ setId, canStudyMulti, dueCount, hasConjugations }: Props) {
  const [direction, setDirection] = useState<'it-en' | 'en-it'>('it-en')

  return (
    <div className="flex flex-col gap-3">
      {/* Direction toggle */}
      <div className="bg-white border-2 border-qz-border rounded-2xl p-4" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
        <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-3">Study direction</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDirection('it-en')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              direction === 'it-en'
                ? 'bg-qz-blue text-white'
                : 'border-2 border-qz-border text-qz-secondary hover:border-qz-blue hover:text-qz-blue'
            }`}
          >
            🇮🇹 Italian → English
          </button>
          <button
            onClick={() => setDirection('en-it')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              direction === 'en-it'
                ? 'bg-qz-blue text-white'
                : 'border-2 border-qz-border text-qz-secondary hover:border-qz-blue hover:text-qz-blue'
            }`}
          >
            🇺🇸 English → Italian
          </button>
        </div>
      </div>

      <Link
        href={`/sets/${setId}/flashcard?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-3xl">🃏</span>
        <div>
          <div className="font-semibold text-qz-text">Flashcards</div>
          <div className="text-sm text-qz-secondary">Flip cards, mark what you know</div>
        </div>
      </Link>

      {hasConjugations && (
        <Link
          href={`/sets/${setId}/conjugation?direction=${direction}`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🔤</span>
          <div>
            <div className="font-semibold text-qz-text">Conjugations</div>
            <div className="text-sm text-qz-secondary">Drill every verb form as a flashcard</div>
          </div>
        </Link>
      )}

      <Link
        href={`/sets/${setId}/sentence-practice?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-3xl">💬</span>
        <div>
          <div className="font-semibold text-qz-text">Sentence Practice</div>
          <div className="text-sm text-qz-secondary">Fill-in-blank, dialogue, and translation</div>
        </div>
      </Link>

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/quiz`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">📝</span>
          <div>
            <div className="font-semibold text-qz-text">Quiz</div>
            <div className="text-sm text-qz-secondary">Multiple choice questions</div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-3xl">📝</span>
          <div>
            <div className="font-semibold text-qz-secondary">Quiz</div>
            <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
          </div>
        </div>
      )}

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/match`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🎯</span>
          <div>
            <div className="font-semibold text-qz-text">Match</div>
            <div className="text-sm text-qz-secondary">Click to pair Italian with English</div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-3xl">🎯</span>
          <div>
            <div className="font-semibold text-qz-secondary">Match</div>
            <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
          </div>
        </div>
      )}

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/listening`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-3xl">🎧</span>
          <div>
            <div className="font-semibold text-qz-text">Listening</div>
            <div className="text-sm text-qz-secondary">Hear Italian, pick the meaning</div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-3xl">🎧</span>
          <div>
            <div className="font-semibold text-qz-secondary">Listening</div>
            <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
          </div>
        </div>
      )}

      <Link
        href={`/sets/${setId}/review`}
        className="flex items-center gap-4 bg-white border-2 border-qz-blue rounded-2xl p-5 hover:bg-qz-blue-light transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-3xl">🔁</span>
        <div className="flex-1">
          <div className="font-semibold text-qz-blue">Review Due Cards</div>
          <div className="text-sm text-qz-secondary">Spaced repetition — study what matters</div>
        </div>
        {dueCount > 0 && (
          <span className="bg-qz-blue text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {dueCount} due
          </span>
        )}
      </Link>

      <Link
        href={`/sets/${setId}/edit`}
        className="text-center py-3 text-sm font-medium text-qz-secondary border-2 border-qz-border rounded-2xl hover:border-qz-blue hover:text-qz-blue transition-colors"
      >
        Edit this set
      </Link>
    </div>
  )
}
