'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  setId: string
  canStudyMulti: boolean
  dueCount: number
  hasConjugations: boolean
}

function FlashcardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2"/>
      <path d="M8 20h8M12 18v2"/>
    </svg>
  )
}

function ConjugationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  )
}

function SentenceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function QuizIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

function ListeningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.98"/>
    </svg>
  )
}

export default function StudyModePicker({ setId, canStudyMulti, dueCount, hasConjugations }: Props) {
  const [direction, setDirection] = useState<'it-en' | 'en-it'>('it-en')

  return (
    <div className="flex flex-col gap-3">
      {/* Direction toggle */}
      <div className="bg-white border-2 border-qz-border rounded-2xl p-4 mb-6" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
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

      {/* Core Study section */}
      <p className="text-xs font-bold uppercase tracking-wider text-qz-secondary pt-4">Core Study</p>

      <Link
        href={`/sets/${setId}/flashcard?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-qz-blue"><FlashcardIcon /></span>
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
          <span className="text-qz-blue"><ConjugationIcon /></span>
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
        <span className="text-qz-blue"><SentenceIcon /></span>
        <div>
          <div className="font-semibold text-qz-text">Sentence Practice</div>
          <div className="text-sm text-qz-secondary">Fill-in-blank, dialogue, and translation</div>
        </div>
      </Link>

      {/* Practice section */}
      <p className="text-xs font-bold uppercase tracking-wider text-qz-secondary pt-4">Practice</p>

      {canStudyMulti ? (
        <Link
          href={`/sets/${setId}/quiz`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-qz-blue"><QuizIcon /></span>
          <div>
            <div className="font-semibold text-qz-text">Quiz</div>
            <div className="text-sm text-qz-secondary">Multiple choice questions</div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-qz-muted"><QuizIcon /></span>
          <div>
            <div className="font-semibold text-qz-secondary">Quiz</div>
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
          <span className="text-qz-blue"><ListeningIcon /></span>
          <div>
            <div className="font-semibold text-qz-text">Listening</div>
            <div className="text-sm text-qz-secondary">Hear Italian, pick the meaning</div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-qz-muted"><ListeningIcon /></span>
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
        <span className="text-qz-blue"><ReviewIcon /></span>
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
        className="text-center py-3 text-sm font-medium text-qz-secondary border-2 border-qz-border rounded-2xl hover:border-qz-blue hover:text-qz-blue transition-colors mt-8"
      >
        Edit this set
      </Link>
    </div>
  )
}
