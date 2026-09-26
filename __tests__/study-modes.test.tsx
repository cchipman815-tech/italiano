import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Card } from '@/lib/types'
import FlashcardStudy from '@/components/FlashcardStudy'
import ConjugationStudy from '@/components/ConjugationStudy'
import QuizStudy from '@/components/QuizStudy'
import GenderBadge from '@/components/GenderBadge'
import { buildConjugationDeck } from '@/lib/study'

vi.mock('next/navigation', () => ({
  usePathname: () => '/sets/citta/flashcard',
  useRouter: () => ({ push: vi.fn() }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function card(id: string, extra: Partial<Card> = {}): Card {
  return { id, set_id: 'citta', italian: id, english: `the ${id}`, sort_order: 0, conjugations: null, enabled: true, ...extra }
}

const place = { path: { it: 'Parole', en: 'Words' }, topic: 'La città' }
const back = { href: '/learn/parole?topic=citta', label: 'La città' }

/** Every save the modes posted, as [url, body]. */
function saves() {
  return fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse((init as RequestInit).body as string)])
}

/** Lets a fling finish, then the next card rise (act flushes React only as it exits). */
function settle() {
  act(() => { vi.advanceTimersByTime(300) })
  act(() => { vi.advanceTimersByTime(300) })
}

describe('FlashcardStudy', () => {
  const cards = [
    card('stazione', { article: 'la', gender: 'f', word_type: 'noun', plural: 'le stazioni', chapter: 1 }),
    card('alto', { english: 'tall', word_type: 'adjective', adjective_forms: { ms: 'alto', fs: 'alta', mp: 'alti', fp: 'alte' } }),
  ]

  it('shows a noun with its article, gender chip and plural, and an adjective’s four forms behind', () => {
    render(<FlashcardStudy cards={cards} place={place} back={back} />)
    const front = document.querySelector('.nm-face.front')!
    expect(front.querySelector('.w')!.textContent).toBe('la stazione')
    expect(front.querySelector('.gch')!.textContent).toBe('la · f')
    expect(front.querySelector('.kick')!.textContent).toBe('nome · pl. le stazioni')
    expect(front.querySelector('.tag')!.textContent).toBe('Parole › La cittàcap. 1')

    fireEvent.click(screen.getByText('Lo so').closest('button')!)
    settle()
    const forms = [...document.querySelectorAll('.nm-face.back .forms span')].map(s => s.textContent)
    expect(forms).toEqual(['msalto', 'fsalta', 'mpalti', 'fpalte'])
  })

  it('answers with the buttons and the arrow keys, skips without saving, then shows the session complete', () => {
    render(<FlashcardStudy cards={[...cards, card('piazza')]} place={place} back={back} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    settle()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    settle()
    fireEvent.click(screen.getByText('Ancora').closest('button')!)
    settle()

    expect(saves()).toEqual([
      ['/api/progress', { cardId: 'stazione', known: true }],
      ['/api/progress', { cardId: 'piazza', known: false }],
    ])
    expect(screen.getByText('Flashcard finite')).toBeInTheDocument()
    expect(document.querySelector('.nm-done .big')!.textContent).toBe('1 / 3')
    expect(screen.getByText('Tornano domani: piazza.')).toBeInTheDocument()
  })

  it('flips with space and ↑, and the hidden face is inert', () => {
    render(<FlashcardStudy cards={cards} place={place} back={back} />)
    const deck = document.querySelector('.nm-card')!
    expect(deck.querySelector('.nm-face.back')).toHaveAttribute('inert')
    fireEvent.keyDown(window, { key: ' ' })
    expect(deck).toHaveClass('flipped')
    expect(deck.querySelector('.nm-face.front')).toHaveAttribute('inert')
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(deck).not.toHaveClass('flipped')
  })
})

describe('ConjugationStudy', () => {
  const parlare = card('parlare', {
    english: 'to speak',
    conjugations: { present: { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' } },
  })

  it('moves the pronoun strip along and saves each form to conjugation progress', () => {
    render(<ConjugationStudy deck={buildConjugationDeck([parlare])} cards={[parlare]} place={place} back={back} />)
    const strip = () => [...document.querySelectorAll('.cj-strip span')].map(s => s.className || '-')
    expect(strip()).toEqual(['now', '-', '-', '-', '-', '-'])
    expect(document.querySelector('.nm-face.front .kick')!.textContent).toContain('io · ___')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    settle()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    settle()
    expect(strip()).toEqual(['did', 'did', 'now', '-', '-', '-'])
    expect(saves()).toEqual([
      ['/api/conjugation-progress', { cardId: 'parlare', pronoun: 'io', known: true }],
      ['/api/conjugation-progress', { cardId: 'parlare', pronoun: 'tu', known: false }],
    ])
  })
})

describe('QuizStudy', () => {
  const cards = ['a', 'b', 'c', 'd'].map(id => card(id))
  const questions = [{ card: cards[0], options: cards, correctIndex: 0 }]

  it('marks the right answer and a wrong pick with icon and label, then finishes after 1.2s', () => {
    render(<QuizStudy questions={questions} cards={cards} back={back} />)
    fireEvent.click(screen.getByText('the b').closest('button')!)
    const [right, wrong] = [screen.getByText('the a').closest('button')!, screen.getByText('the b').closest('button')!]
    expect(right).toHaveClass('right')
    expect(right.textContent).toContain('Giusta')
    expect(wrong).toHaveClass('wrong', 'shake')
    expect(wrong.textContent).toContain('La tua')
    expect(saves()).toEqual([['/api/progress', { cardId: 'a', known: false }]])

    act(() => { vi.advanceTimersByTime(1200) })
    expect(screen.getByText('Quiz finito')).toBeInTheDocument()
    expect(screen.getByText('Le sbagliate tornano nel prossimo ripasso.')).toBeInTheDocument()
  })
})

describe('GenderBadge', () => {
  it('is a neutral chip reading "la · f"', () => {
    const { container } = render(<GenderBadge gender="f" article="la" />)
    expect(container.textContent).toBe('la · f')
    expect(container.firstChild).toHaveClass('gch')
    render(<GenderBadge gender={null} article="il" />)
  })
})
