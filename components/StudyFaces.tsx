import type { ReactNode } from 'react'
import type { Card, Pronoun } from '@/lib/types'
import { formEnglish, italianOf, kickFor, verbEnglish, type CardPlace, type Direction } from '@/lib/study'
import { SpeakOrb } from './Speak'
import GenderBadge from './GenderBadge'
import Bi from './Bi'

export interface Faces {
  front: ReactNode
  back: ReactNode
}

/** "Parole › La città  cap. 1" in the card's corner. */
function Tag({ place, chapter }: { place: CardPlace | undefined; chapter?: number | null }) {
  if (!place) return null
  return (
    <span className="tag">
      {place.path && <><b lang="it">{place.path.it}</b> › </>}
      <span lang="it">{place.topic}</span>
      {chapter != null && <i>cap. {chapter}</i>}
    </span>
  )
}

function TapHint() {
  return <span className="tap nm-x"><Bi k="tapToFlip" /></span>
}

function Example({ card }: { card: Card }) {
  if (!card.example) return null
  return (
    <span className="ex">
      <i lang="it">{card.example.italian}</i>
      <span>{card.example.english}</span>
    </span>
  )
}

/** Singular on the left, plural on the right: io | noi, tu | voi, lui/lei | loro. */
const TABLE_ORDER: Pronoun[] = ['io', 'noi', 'tu', 'voi', 'lui/lei', 'loro']

/** The back's details: a verb's present tense, or an adjective's four forms. */
function Forms({ card }: { card: Card }) {
  const present = card.conjugations?.present
  if (present) {
    return (
      <span className="forms">
        {TABLE_ORDER.map(p => <span key={p}><em>{p}</em><b lang="it">{present[p]}</b></span>)}
      </span>
    )
  }
  const adj = card.adjective_forms
  if (adj) {
    return (
      <span className="forms">
        {(['ms', 'fs', 'mp', 'fp'] as const).map(k => <span key={k}><em>{k}</em><b lang="it">{adj[k]}</b></span>)}
      </span>
    )
  }
  return null
}

/**
 * A word's two faces. IT → EN: the Italian (with its article), gender and
 * word type in front; the English, the verb's or adjective's forms and the
 * example behind. EN → IT swaps the words and keeps the details behind.
 */
export function wordFaces(card: Card, { direction, place }: { direction: Direction; place?: CardPlace }): Faces {
  const italian = italianOf(card)
  const kick = kickFor(card)
  const tag = <Tag place={place} chapter={card.chapter} />

  const italianBlock = (
    <>
      <span className="w ser" lang="it">{italian}</span>
      {kick && <span className="kick" lang="it">{kick}</span>}
      <GenderBadge gender={card.gender} article={card.article} className="gtag" />
    </>
  )
  const englishWord = <span className="w sans">{card.english}</span>

  if (direction === 'en-it') {
    return {
      front: <>{tag}{englishWord}<TapHint /></>,
      back: <><SpeakOrb text={italian} />{italianBlock}<Forms card={card} /><Example card={card} /></>,
    }
  }
  return {
    front: <>{tag}<SpeakOrb text={italian} />{italianBlock}<TapHint /></>,
    back: <><SpeakOrb text={italian} />{englishWord}<span className="kick" lang="it">{italian}</span><Forms card={card} /><Example card={card} /></>,
  }
}

/**
 * One conjugation form. IT → EN asks for the form: "parlare / io · ___" in
 * front, "parlo" (and "I speak") behind. EN → IT starts from "I speak".
 */
export function formFaces(
  card: Card,
  pronoun: Pronoun,
  form: string,
  { direction, place }: { direction: Direction; place?: CardPlace },
): Faces {
  const english = formEnglish(card.english, pronoun)
  const tag = <Tag place={place} chapter={card.chapter} />
  const answer = (
    <>
      <SpeakOrb text={form} />
      <span className="w ser" lang="it">{form}</span>
      <span className="ex"><i lang="it">{pronoun} {form}</i><span>{english}</span></span>
    </>
  )

  if (direction === 'en-it') {
    return {
      front: <>{tag}<span className="w sans">{english}</span><span className="kick" lang="it">{card.italian} · {pronoun}</span><TapHint /></>,
      back: answer,
    }
  }
  return {
    front: (
      <>
        {tag}
        <SpeakOrb text={card.italian} />
        <span className="w ser" lang="it">{card.italian}</span>
        <span className="kick"><span lang="it">{pronoun} · ___</span> <span className="sr-only">({verbEnglish(card.english)})</span></span>
        <TapHint />
      </>
    ),
    back: answer,
  }
}
