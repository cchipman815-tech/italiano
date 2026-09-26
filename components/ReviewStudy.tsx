'use client'
import { useState } from 'react'
import { reviewItemKey, reviewItemLabel, type CardPlace, type ReviewItem, type BackLink } from '@/lib/study'
import { saveFormProgress, saveProgress } from '@/lib/progress-client'
import { shuffleArray } from '@/lib/utils'
import SwipeDeck, { type Verdict } from './SwipeDeck'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import { formFaces, wordFaces } from './StudyFaces'

interface Props {
  /** Due cards and conjugation forms, already shuffled on the server so hydration matches. */
  items: ReviewItem[]
  /** Path and topic per set id, for each card's tag. */
  places: Record<string, CardPlace>
  /** Where the back button goes: the topic, the path, or Oggi. */
  back: BackLink
  /** Shown before the count when the deck is one chapter, e.g. "cap. 3". */
  capLabel?: string
}

/** Ripasso: everything due today as one swipe deck. Forms save to conjugation progress. */
export default function ReviewStudy({ items, places, back, capLabel }: Props) {
  const [deck, setDeck] = useState(items)
  const [index, setIndex] = useState(0)
  const [known, setKnown] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const item = deck[index]

  function onCommit(verdict: Verdict) {
    if (verdict === 0) return
    if (item.kind === 'card') saveProgress(item.card.id, verdict > 0)
    else saveFormProgress(item.card.id, item.pronoun, verdict > 0)
    if (verdict > 0) setKnown(k => k + 1)
    else setMissed(m => [...m, reviewItemLabel(item)])
  }

  function onAdvance() {
    if (index + 1 >= deck.length) setDone(true)
    else setIndex(i => i + 1)
  }

  function again() {
    setDeck(shuffleArray(items))
    setIndex(0)
    setKnown(0)
    setMissed([])
    setDone(false)
  }

  if (done) {
    return (
      <SessionComplete
        mode="review"
        result={{ right: known, wrong: missed.length, total: deck.length, missed }}
        back={back}
        onAgain={again}
      />
    )
  }

  const place = places[item.card.set_id]
  const faces = item.kind === 'card'
    ? wordFaces(item.card, { direction: 'it-en', place })
    : formFaces(item.card, item.pronoun, item.form, { direction: 'it-en', place })

  return (
    <div className={`st-view${item.kind === 'form' ? ' cj' : ''}`}>
      <StudyTop back={back} count={<span className="tab-n">{capLabel && `${capLabel} · `}{index + 1} / {deck.length}</span>} progress={(index + 1) / deck.length} />
      <SwipeDeck itemKey={reviewItemKey(item)} front={faces.front} back={faces.back} onCommit={onCommit} onAdvance={onAdvance} />
    </div>
  )
}
