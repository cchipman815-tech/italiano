import { describe, it, expect } from 'vitest'
import type { Card } from '@/lib/types'
import {
  buildConjugationDeck,
  buildMatchRounds,
  buildQuestions,
  formEnglish,
  formatSeconds,
  genderChip,
  italianOf,
  kickFor,
  listWords,
  parseDirection,
  reviewItems,
  verbEnglish,
} from '@/lib/study'

const PARLARE = { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' }
const FINIRE = { io: 'finisco', tu: 'finisci', 'lui/lei': 'finisce', noi: 'finiamo', voi: 'finite', loro: 'finiscono' }

function card(id: string, extra: Partial<Card> = {}): Card {
  return { id, set_id: 's', italian: id, english: `the ${id}`, sort_order: 0, conjugations: null, enabled: true, ...extra }
}

describe('labels', () => {
  it('shows nouns with their article, elided or not', () => {
    expect(italianOf(card('stazione', { article: 'la' }))).toBe('la stazione')
    expect(italianOf(card('università', { article: "l'" }))).toBe("l'università")
    expect(italianOf(card('parlare'))).toBe('parlare')
  })

  it('words the gender chip as "la · f"', () => {
    expect(genderChip({ gender: 'f', article: 'la' })).toBe('la · f')
    expect(genderChip({ gender: 'm', article: null })).toBe('m')
    expect(genderChip({ gender: null, article: 'il' })).toBeNull()
  })

  it('describes each word type under the word', () => {
    expect(kickFor(card('stazione', { word_type: 'noun', plural: 'le stazioni' }))).toBe('nome · pl. le stazioni')
    expect(kickFor(card('capire', { word_type: 'verb', conjugations: { present: FINIRE } }))).toBe('verbo · finisco, finisci, finisce…')
    expect(kickFor(card('stanco', { word_type: 'adjective' }))).toBe('aggettivo')
    expect(kickFor(card('Piacere', { word_type: 'phrase' }))).toBe('frase')
    expect(kickFor(card('ciao'))).toBeNull()
  })

  it('turns a verb and pronoun into English', () => {
    expect(verbEnglish('speak')).toBe('to speak')
    expect(verbEnglish('to speak')).toBe('to speak')
    expect(formEnglish('to speak', 'noi')).toBe('we speak')
    expect(formEnglish('to finish', 'lui/lei')).toBe('he/she finishes')
    expect(formEnglish('to study', 'lui/lei')).toBe('he/she studies')
    expect(formEnglish('to play', 'lui/lei')).toBe('he/she plays')
    expect(formEnglish('to have', 'lui/lei')).toBe('he/she has')
    expect(formEnglish('to be', 'io')).toBe('I am')
    expect(formEnglish('to be', 'voi')).toBe('you all are')
    expect(formEnglish('to go out', 'lui/lei')).toBe('he/she goes out')
    expect(formEnglish('to want, to wish', 'tu')).toBe('you want')
  })

  it('parses the direction, defaulting to IT → EN', () => {
    expect(parseDirection('en-it')).toBe('en-it')
    expect(parseDirection(undefined)).toBe('it-en')
    expect(parseDirection('sideways')).toBe('it-en')
  })

  it('formats times and short word lists', () => {
    expect(formatSeconds(83)).toBe('1:23')
    expect(formatSeconds(7)).toBe('0:07')
    expect(listWords(['a', 'b'])).toEqual({ it: 'a, b', en: 'a, b' })
    expect(listWords(['a', 'b', 'c', 'd', 'e'])).toEqual({ it: 'a, b, c e altre 2', en: 'a, b, c and 2 more' })
    expect(listWords(['a', 'b', 'c', 'd'])).toEqual({ it: "a, b, c e un'altra", en: 'a, b, c and 1 more' })
  })
})

describe('buildQuestions', () => {
  const cards = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => card(id))

  it('asks each card at most once, with 4 distinct options including the answer', () => {
    const qs = buildQuestions(cards, 20)
    expect(qs).toHaveLength(6)
    expect(new Set(qs.map(q => q.card.id)).size).toBe(6)
    for (const q of qs) {
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options.map(o => o.id)).size).toBe(4)
      expect(q.options[q.correctIndex].id).toBe(q.card.id)
    }
  })

  it('caps the number of questions', () => {
    expect(buildQuestions(cards, 3)).toHaveLength(3)
  })
})

describe('buildMatchRounds', () => {
  const deck = (n: number) => Array.from({ length: n }, (_, i) => card(`c${i}`))

  it('uses every card once, in rounds of 4', () => {
    const rounds = buildMatchRounds(deck(8))
    expect(rounds.map(r => r.pairs.length)).toEqual([4, 4])
    expect(new Set(rounds.flatMap(r => r.pairs.map(c => c.id))).size).toBe(8)
  })

  it('folds a remainder of 1 or 2 into the last round, but keeps a remainder of 3', () => {
    expect(buildMatchRounds(deck(9)).map(r => r.pairs.length)).toEqual([4, 5])
    expect(buildMatchRounds(deck(10)).map(r => r.pairs.length)).toEqual([4, 6])
    expect(buildMatchRounds(deck(11)).map(r => r.pairs.length)).toEqual([4, 4, 3])
    expect(buildMatchRounds(deck(4)).map(r => r.pairs.length)).toEqual([4])
  })

  it('shuffles the English column so it never lines up row for row', () => {
    for (let i = 0; i < 50; i++) {
      for (const round of buildMatchRounds(deck(8))) {
        expect([...round.englishOrder].sort()).toEqual([0, 1, 2, 3])
        expect(round.englishOrder.some((v, k) => v !== k)).toBe(true)
      }
    }
  })
})

describe('buildConjugationDeck', () => {
  const parlare = card('parlare', { conjugations: { present: PARLARE } })
  const finire = card('finire', { conjugations: { present: FINIRE } })
  const casa = card('casa')

  it('drills one verb at a time, pronouns in order, and skips cards without forms', () => {
    const deck = buildConjugationDeck([parlare, casa, finire])
    expect(deck).toHaveLength(12)
    for (const start of [0, 6]) {
      const verb = deck.slice(start, start + 6)
      expect(new Set(verb.map(i => i.card.id)).size).toBe(1)
      expect(verb.map(i => i.pronoun)).toEqual(['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'])
    }
    expect(deck.find(i => i.card.id === 'parlare' && i.pronoun === 'noi')?.form).toBe('parliamo')
  })

  it('leaves out forms switched off, and verbs with every form off', () => {
    const someOff = card('parlare', { conjugations: { present: PARLARE, off: ['noi', 'voi', 'loro'] } })
    const allOff = card('finire', { conjugations: { present: FINIRE, off: ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'] } })
    const deck = buildConjugationDeck([someOff, allOff])
    expect(deck.map(i => i.pronoun)).toEqual(['io', 'tu', 'lui/lei'])
  })

  it('puts verbs with forms due today first', () => {
    for (let i = 0; i < 20; i++) {
      expect(buildConjugationDeck([parlare, finire], new Set(['finire']))[0].card.id).toBe('finire')
    }
  })
})

describe('reviewItems', () => {
  const parlare = card('parlare', { conjugations: { present: PARLARE } })
  const finire = card('finire', { conjugations: { present: FINIRE }, enabled: false })
  const casa = card('casa')

  it('takes due cards, then due forms of enabled verbs, and drops disabled verbs', () => {
    const items = reviewItems([parlare, finire, casa], new Set(['casa']), [
      { card_id: 'parlare', pronoun: 'noi' },
      { card_id: 'finire', pronoun: 'io' },
      { card_id: 'gone', pronoun: 'tu' },
    ])
    expect(items).toEqual([
      { kind: 'card', card: casa },
      { kind: 'form', card: parlare, pronoun: 'noi', form: 'parliamo' },
    ])
  })

  it('drops a due form that was switched off', () => {
    const off = card('parlare', { conjugations: { present: PARLARE, off: ['noi'] } })
    expect(reviewItems([off], new Set(), [{ card_id: 'parlare', pronoun: 'noi' }])).toEqual([])
  })
})
