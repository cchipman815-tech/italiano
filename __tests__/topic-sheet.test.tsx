import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TopicSheet from '@/components/TopicSheet'

vi.mock('next/navigation', () => ({
  usePathname: () => '/learn/frasi',
  useRouter: () => ({ push: vi.fn() }),
}))

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})

const cortesia = { id: 'cortesia', title: 'Cortesia', active: 3, conjugable: 0, due: 0 }

function sheet(topic = cortesia, path: 'frasi' | 'verbi' = 'frasi') {
  return render(<TopicSheet path={path} topic={topic} open onClose={() => {}} />)
}

describe('TopicSheet', () => {
  it('lists the path’s modes in order and gates the 4-card ones with the reason', () => {
    sheet()
    const rows = [...document.querySelectorAll('.nm-list:first-child .nm-row')]
    expect(rows.map(r => r.querySelector('b')!.textContent)).toEqual(['AscoltoListening', 'FrasiSentences', 'FlashcardFlashcards', 'Quiz'])
    const ascolto = rows[0] as HTMLButtonElement
    expect(ascolto.disabled).toBe(true)
    expect(ascolto.textContent).toContain('Servono almeno 4 carte attive · ne hai 3')
    expect(rows[1].getAttribute('href')).toBe('/sets/cortesia/sentence-practice')
  })

  it('carries the chosen direction into mode links', () => {
    sheet()
    fireEvent.click(screen.getByRole('button', { name: 'EN → IT' }))
    expect(document.querySelector('a.nm-row[href*="flashcard"]')!.getAttribute('href')).toBe('/sets/cortesia/flashcard?direction=en-it')
  })

  it('reviews what is due, or starts the first open mode when nothing is', () => {
    const { unmount } = sheet({ ...cortesia, due: 2 })
    expect(document.querySelector('.nm-cta')!.getAttribute('href')).toBe('/review?set=cortesia')
    expect(document.querySelector('.nm-cta')!.textContent).toContain('Ripassa 2')
    unmount()
    sheet()
    expect(document.querySelector('.nm-cta')!.getAttribute('href')).toBe('/sets/cortesia/sentence-practice')
  })

  it('disables Coniugazioni for idioms without forms', () => {
    sheet({ id: 'avere-fare', title: 'Con avere e fare', active: 13, conjugable: 0, due: 0 }, 'verbi')
    const first = document.querySelector('.nm-list .nm-row') as HTMLButtonElement
    expect(first.disabled).toBe(true)
    expect(first.textContent).toContain('Nessun verbo da coniugare')
  })

  it('links to Modifica argomento', () => {
    sheet()
    expect(document.querySelector('a[href="/sets/cortesia/edit"]')).not.toBeNull()
  })
})

describe('a sheet that starts open (e.g. /learn/frasi?topic=…)', () => {
  it('still closes with Escape and makes the page inert after hydration', async () => {
    const { renderToString } = await import('react-dom/server')
    const { act } = await import('@testing-library/react')
    const onClose = vi.fn()
    const ui = (
      <>
        <div data-shell-bg id="page" />
        <TopicSheet path="frasi" topic={cortesia} open onClose={onClose} />
      </>
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(ui)
    document.body.appendChild(container)
    await act(async () => { render(ui, { container, hydrate: true }) })

    expect((document.getElementById('page') as HTMLElement).inert).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
