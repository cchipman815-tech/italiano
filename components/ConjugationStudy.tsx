'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'
import { buildConjugationDeck, PRONOUNS, type CardPlace, type ConjugationItem, type Direction, type BackLink } from '@/lib/study'
import { saveFormProgress } from '@/lib/progress-client'
import SwipeDeck, { type Verdict } from './SwipeDeck'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import { formFaces } from './StudyFaces'
import { Icon } from './StudyIcons'

interface Props {
  /** Built on the server (lib/study.ts buildConjugationDeck) so hydration matches. */
  deck: ConjugationItem[]
  /** The topic's enabled cards, to deal a fresh deck for "Di nuovo". */
  cards: Card[]
  place: CardPlace
  back: BackLink
  direction?: Direction
}

/**
 * Coniugazioni: every present-tense form, one verb at a time. The pronoun
 * strip shows where you are in the verb; each answer saves to
 * conjugation_progress, and missed forms come due tomorrow.
 */
export default function ConjugationStudy({ deck: initialDeck, cards, place, back, direction = 'it-en' }: Props) {
  const [deck, setDeck] = useState(initialDeck)
  const [index, setIndex] = useState(0)
  const [known, setKnown] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const item = deck[index]

  function onCommit(verdict: Verdict) {
    if (verdict === 0) return
    saveFormProgress(item.card.id, item.pronoun, verdict > 0)
    if (verdict > 0) setKnown(k => k + 1)
    else setMissed(m => [...m, `${item.pronoun} ${item.form}`])
  }

  function onAdvance() {
    if (index + 1 >= deck.length) setDone(true)
    else setIndex(i => i + 1)
  }

  function again() {
    setDeck(buildConjugationDeck(cards))
    setIndex(0)
    setKnown(0)
    setMissed([])
    setDone(false)
  }

  if (done) {
    return (
      <SessionComplete
        mode="conjugations"
        result={{ right: known, wrong: missed.length, total: deck.length, missed }}
        back={back}
        onAgain={again}
      />
    )
  }

  const current = PRONOUNS.indexOf(item.pronoun)
  const faces = formFaces(item.card, item.pronoun, item.form, { direction, place })

  return (
    <div className="st-view cj">
      <StudyTop back={back} count={<span className="tab-n">{index + 1} / {deck.length}</span>} progress={(index + 1) / deck.length} />
      <div className="cj-strip" aria-hidden="true">
        {PRONOUNS.map((p, k) => (
          <span key={p} lang="it" className={k === current ? 'now' : k < current ? 'did' : undefined}>
            {k < current && <Icon name="check" size={11} strokeWidth={3} />}
            {p}
          </span>
        ))}
      </div>
      <SwipeDeck itemKey={`${item.card.id}:${item.pronoun}`} front={faces.front} back={faces.back} onCommit={onCommit} onAdvance={onAdvance} />
    </div>
  )
}
