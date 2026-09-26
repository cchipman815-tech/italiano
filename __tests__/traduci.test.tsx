import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import TranslateView from '@/components/TranslateView'

vi.mock('next/navigation', () => ({
  usePathname: () => '/translate',
  useRouter: () => ({ push: vi.fn() }),
}))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  window.scrollBy = vi.fn()
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  fetchMock.mockReset()
  globalThis.fetch = fetchMock
})

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

async function translate(text: string) {
  fireEvent.change(screen.getByLabelText(/Testo da tradurre/), { target: { value: text } })
  fireEvent.keyDown(screen.getByLabelText(/Testo da tradurre/), { key: 'Enter' })
  await flush()
  await flush()
}

const bodyOf = (url: string, method = 'POST') => {
  const call = fetchMock.mock.calls.find(([u, init]) => u === url && init?.method === method)
  return call ? JSON.parse(call[1].body) : undefined
}

describe('Traduci', () => {
  it('shows a word with its article and gender, and saves it with the article', async () => {
    fetchMock.mockImplementation((url: string) => url === '/api/translate'
      ? json({ italian: 'stazione', article: 'la', gender: 'f', plural: 'le stazioni', grammarNote: 'Feminine.' })
      : json({ id: 'row1' }, 201))
    render(<TranslateView />)
    await translate('station')

    expect(bodyOf('/api/translate')).toEqual({ english: 'station', mode: 'word' })
    expect(screen.getByText('la stazione', { selector: 'b' })).toBeTruthy()
    expect(document.querySelector('.gch')!.textContent).toBe('la·femminilefeminine')
    expect(screen.getByText('pl. le stazioni')).toBeTruthy()
    expect(bodyOf('/api/saved-translations')).toEqual({ english: 'station', italian: 'la stazione' })
    expect(document.querySelector('.tr-saved')!.textContent).toContain('Salvata in Salvate')
  })

  it('Annulla unsaves in place, and Salva saves again', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/translate') return json({ italian: 'Vorrei un caffè.', literalNote: '' })
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }))
      return json({ id: 'row1' }, 201)
    })
    render(<TranslateView />)
    await translate("I'd like a coffee")
    expect(bodyOf('/api/translate')).toEqual({ english: "I'd like a coffee", mode: 'sentence' })

    fireEvent.click(screen.getByRole('button', { name: /Annulla/ }))
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('/api/saved-translations/row1', { method: 'DELETE' })
    expect(document.querySelector('.tr-saved')!.className).toContain('off')

    fireEvent.click(screen.getByRole('button', { name: /Salva/ }))
    await flush()
    expect(fetchMock.mock.calls.filter(([u, i]) => u === '/api/saved-translations' && i?.method === 'POST')).toHaveLength(2)
    expect(document.querySelector('.tr-saved')!.textContent).toContain('Salvata in Salvate')
  })

  it('translates Italian to English and saves the pair', async () => {
    fetchMock.mockImplementation((url: string) => url === '/api/translate' ? json({ english: "Where's the bathroom?" }) : json({ id: 'r' }, 201))
    render(<TranslateView />)
    fireEvent.click(screen.getByRole('button', { name: 'IT → EN' }))
    await translate("Dov'è il bagno?")
    expect(bodyOf('/api/translate')).toEqual({ text: "Dov'è il bagno?", mode: 'it-en' })
    expect(bodyOf('/api/saved-translations')).toEqual({ english: "Where's the bathroom?", italian: "Dov'è il bagno?" })
  })

  it('shows the error card with Riprova when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<TranslateView />)
    await translate('station')
    expect(screen.getByText('Impossibile tradurre')).toBeTruthy()
    expect(screen.getByText('Controlla la connessione e riprova.')).toBeTruthy()

    fetchMock.mockImplementation((url: string) => url === '/api/translate' ? json({ italian: 'stazione' }) : json({ id: 'r' }, 201))
    fireEvent.click(screen.getByRole('button', { name: /Riprova/ }))
    await flush()
    await flush()
    expect(screen.getByText('stazione', { selector: 'b' })).toBeTruthy()
  })

  it('asks for text instead of sending an empty request', () => {
    render(<TranslateView />)
    fireEvent.click(screen.getByRole('button', { name: /Traduci/ }))
    expect(screen.getByText('Scrivi una parola o una frase.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
