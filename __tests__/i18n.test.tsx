import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { STRINGS, label, plainText, t } from '@/lib/i18n'
import Bi from '@/components/Bi'

describe('t', () => {
  it('returns the Italian/English pair', () => {
    expect(t('today')).toEqual({ it: 'Oggi', en: 'Today' })
  })

  it('has both halves for every string', () => {
    for (const pair of Object.values(STRINGS)) {
      expect(pair.it.length).toBeGreaterThan(0)
      expect(pair.en.length).toBeGreaterThan(0)
    }
  })
})

describe('label at each immersion level', () => {
  it('it: Italian only', () => {
    expect(label(t('learn'), 'it')).toEqual({ text: 'Impara', lang: 'it', sub: null })
  })

  it('mix: Italian with a smaller English line', () => {
    expect(label(t('learn'), 'mix')).toEqual({ text: 'Impara', lang: 'it', sub: 'Learn' })
  })

  it('en: English only', () => {
    expect(label(t('learn'), 'en')).toEqual({ text: 'Learn', lang: 'en', sub: null })
  })

  it('mix drops the English line when both halves match', () => {
    expect(label({ it: 'Quiz', en: 'Quiz' }, 'mix').sub).toBeNull()
  })
})

describe('plainText', () => {
  it('flattens a pair for aria-label at each level', () => {
    expect(plainText(t('saved'), 'it')).toBe('Salvate')
    expect(plainText(t('saved'), 'mix')).toBe('Salvate · Saved')
    expect(plainText(t('saved'), 'en')).toBe('Saved')
  })
})

describe('<Bi>', () => {
  it('renders both halves, the Italian marked lang="it", for CSS to choose', () => {
    const { container } = render(<Bi k="translate" />)
    const it = container.querySelector('.nm-it')!
    expect(it.textContent).toBe('Traduci')
    expect(it.getAttribute('lang')).toBe('it')
    expect(container.querySelector('.nm-en')!.textContent).toBe('Translate')
  })

  it('takes a literal pair and the layout modifiers', () => {
    const { container } = render(<Bi it="Parole" en="Words" stack itOnlyInMix />)
    expect(container.firstElementChild!.className).toBe('nm-st nm-x')
  })

  it('renders a single span when both halves match', () => {
    const { container } = render(<Bi it="Quiz" en="Quiz" />)
    expect(container.innerHTML).toBe('<span>Quiz</span>')
  })
})
