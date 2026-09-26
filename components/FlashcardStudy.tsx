'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'
import { italianOf, type CardPlace, type Direction, type BackLink } from '@/lib/study'
import { saveProgress } from '@/lib/progress-client'
import { shuffleArray } from '@/lib/utils'
import SwipeDeck, { type Verdict } from './SwipeDeck'
import SessionComplete from './SessionComplete'
import StudyTop from './StudyTop'
import { wordFaces } from './StudyFaces'

interface Props {
  /** Enabled cards, already shuffled on the server so hydration matches. */
  cards: Card[]
  place: CardPlace
  back: BackLink
  direction?: Direction
}

/** Flashcard: the topic's cards as a swipe deck. Lo so / Ancora save progress; Salta doesn't. */
export default function FlashcardStudy({ cards, place, back, direction = 'it-en' }: Props) {
  const [deck, setDeck] = useState(cards)
  const [index, setIndex] = useState(0)
  const [known, setKnown] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const card = deck[index]

  function onCommit(verdict: Verdict) {
    if (verdict === 0) return
    saveProgress(card.id, verdict > 0)
    if (verdict > 0) setKnown(k => k + 1)
    else setMissed(m => [...m, italianOf(card)])
  }

  function onAdvance() {
    if (index + 1 >= deck.length) setDone(true)
    else setIndex(i => i + 1)
  }

  function again() {
    setDeck(shuffleArray(cards))
    setIndex(0)
    setKnown(0)
    setMissed([])
    setDone(false)
  }

  if (done) {
    return (
      <SessionComplete
        mode="flashcard"
        result={{ right: known, wrong: missed.length, total: deck.length, missed }}
        back={back}
        onAgain={again}
      />
    )
  }

  const faces = wordFaces(card, { direction, place })
  return (
    <div className="st-view">
      <StudyTop back={back} count={<span className="tab-n">{index + 1} / {deck.length}</span>} progress={(index + 1) / deck.length} />
      <SwipeDeck itemKey={card.id} front={faces.front} back={faces.back} onCommit={onCommit} onAdvance={onAdvance} />
    </div>
  )
}
