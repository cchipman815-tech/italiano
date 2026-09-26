'use client'
import { useState } from 'react'
import NavLink from '@/components/NavLink'
import {
  FlashcardIcon,
  ConjugationIcon,
  SentenceIcon,
  QuizIcon,
  ListeningIcon,
  ReviewIcon,
} from '@/components/StudyIcons'

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

      {/* Review Due Cards — prominent at top */}
      <NavLink
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
      </NavLink>

      {/* Core Study section */}
      <p className="text-xs font-bold uppercase tracking-wider text-qz-secondary pt-4">Core Study</p>

      <NavLink
        href={`/sets/${setId}/flashcard?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-qz-blue"><FlashcardIcon /></span>
        <div>
          <div className="font-semibold text-qz-text">Flashcards</div>
          <div className="text-sm text-qz-secondary">Flip cards, mark what you know</div>
        </div>
      </NavLink>

      {hasConjugations && (
        <NavLink
          href={`/sets/${setId}/conjugation?direction=${direction}`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-qz-blue"><ConjugationIcon /></span>
          <div>
            <div className="font-semibold text-qz-text">Conjugations</div>
            <div className="text-sm text-qz-secondary">Drill every verb form as a flashcard</div>
          </div>
        </NavLink>
      )}

      <NavLink
        href={`/sets/${setId}/sentence-practice?direction=${direction}`}
        className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
        style={{ boxShadow: 'var(--qz-shadow-sm)' }}
      >
        <span className="text-qz-blue"><SentenceIcon /></span>
        <div>
          <div className="font-semibold text-qz-text">Sentences</div>
          <div className="text-sm text-qz-secondary">Fill-in-blank, dialogue, and translation</div>
        </div>
      </NavLink>

      {/* Practice section */}
      <p className="text-xs font-bold uppercase tracking-wider text-qz-secondary pt-4">Practice</p>

      {canStudyMulti ? (
        <NavLink
          href={`/sets/${setId}/quiz`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-qz-blue"><QuizIcon /></span>
          <div>
            <div className="font-semibold text-qz-text">Quiz</div>
            <div className="text-sm text-qz-secondary">Multiple choice questions</div>
          </div>
        </NavLink>
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
        <NavLink
          href={`/sets/${setId}/listening`}
          className="flex items-center gap-4 bg-white border-2 border-qz-border rounded-2xl p-5 hover:border-qz-blue transition-colors"
          style={{ boxShadow: 'var(--qz-shadow-sm)' }}
        >
          <span className="text-qz-blue"><ListeningIcon /></span>
          <div>
            <div className="font-semibold text-qz-text">Listening</div>
            <div className="text-sm text-qz-secondary">Hear Italian, pick the meaning</div>
          </div>
        </NavLink>
      ) : (
        <div className="flex items-center gap-4 bg-qz-subtle border-2 border-qz-border rounded-2xl p-5 opacity-50 cursor-not-allowed">
          <span className="text-qz-muted"><ListeningIcon /></span>
          <div>
            <div className="font-semibold text-qz-secondary">Listening</div>
            <div className="text-sm text-qz-secondary">Need at least 4 cards to enable</div>
          </div>
        </div>
      )}

      <NavLink
        href={`/sets/${setId}/edit`}
        className="text-center py-3 text-sm font-medium text-qz-secondary border-2 border-qz-border rounded-2xl hover:border-qz-blue hover:text-qz-blue transition-colors mt-8"
      >
        Edit this set
      </NavLink>
    </div>
  )
}
