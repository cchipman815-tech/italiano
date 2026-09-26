'use client'
import type { ReactNode } from 'react'
import { Icon } from './StudyIcons'
import Bi from './Bi'

export interface Choice {
  key: string
  label: ReactNode
  lang?: 'it' | 'en'
}

/**
 * Answer buttons for Quiz, Ascolto and Frasi. After a pick the right answer
 * turns green with a check that grows in ("Giusta"); a wrong pick outlines
 * red, shakes once and says "La tua"; the rest dim. Icon, label and color
 * all change, so no state depends on motion or color alone.
 */
export default function ChoiceList({
  choices,
  correct,
  picked,
  onPick,
  className = 'nm-opts',
}: {
  choices: Choice[]
  correct: number
  picked: number | null
  onPick: (index: number) => void
  className?: string
}) {
  const answered = picked != null
  return (
    <>
      <div className={className}>
        {choices.map((c, k) => {
          const state = !answered ? '' : k === correct ? ' right' : k === picked ? ' wrong shake' : ' dim'
          const marked = answered && (k === correct || k === picked)
          return (
            <button key={c.key} type="button" className={`nm-opt q-opt${state}`} disabled={answered} onClick={() => onPick(k)}>
              <span lang={c.lang}>{c.label}</span>
              <span className="st nm-x" aria-hidden={!marked}>
                <Icon name={k === correct ? 'check' : 'x'} size={16} strokeWidth={2.8} />
                {k === correct ? <Bi it="Giusta" en="Correct" /> : <Bi it="La tua" en="Your pick" />}
              </span>
            </button>
          )
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {answered && (picked === correct ? <Bi it="Giusto" en="Correct" /> : <Bi it="Non proprio" en="Not quite" />)}
      </p>
    </>
  )
}
