import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import Shell from '@/components/Shell'
import SavedView from '@/components/SavedView'
import type { SavedTranslation } from '@/lib/types'

vi.mock('next/navigation', () => ({
  usePathname: () => '/saved',
  useRouter: () => ({ push: vi.fn() }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  fetchMock.mockReset()
  globalThis.fetch = fetchMock
})
afterEach(() => vi.useRealTimers())

const NOW = '2026-09-26T15:00:00Z'
const item = (id: string, italian: string, english: string, created_at: string): SavedTranslation =>
  ({ id, user_id: 1, italian, english, created_at })

const items = [
  item('s1', 'la stazione', 'the station', '2026-09-26T10:00:00Z'),
  item('s2', 'Vorrei un caffè.', "I'd like a coffee.", '2026-09-26T09:00:00Z'),
  item('s3', 'il binario', 'the platform', '2026-09-25T09:00:00Z'),
]
const topics = [
  { id: 'citta', title: 'La città', category: 'nouns' },
  { id: 'cortesia', title: 'Cortesia', category: 'phrases' },
  { id: 'old', title: 'Chapter 7', category: 'general' },
]

function renderSaved(initial = items) {
  return render(
    <Shell user={{ id: 1, name: 'Chance' }} initialPrefs={{ theme: 'notte', imm: 'mix', layout: 'mobile' }}>
      <SavedView initial={initial} topics={topics} now={NOW} timeZone="UTC" />
    </Shell>,
  )
}

const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe('Salvate', () => {
  it('counts, groups by day and searches without accents', () => {
    renderSaved()
    expect(screen.getByText('3 salvate da te')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Oggi · Today' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Ieri · Yesterday' })).getByText('il binario')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Cerca nelle salvate/), { target: { value: 'caffe' } })
    expect(screen.queryByText('la stazione')).toBeNull()
    expect(screen.getByText('Vorrei un caffè.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Cerca nelle salvate/), { target: { value: 'gelato' } })
    fireEvent.click(screen.getByRole('button', { name: /Cancella ricerca/ }))
    expect(screen.getByText('la stazione')).toBeTruthy()
  })

  it('shows the empty state with a way to Traduci', () => {
    renderSaved([])
    expect(screen.getByText('Nessuna traduzione salvata')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Apri Traduci/ }).getAttribute('href')).toBe('/translate')
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('deletes from the actions sheet and undo restores the row with its date', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }))
      return ok({ ...items[0], id: 's9' }, 201)
    })
    renderSaved()
    fireEvent.click(screen.getByText('la stazione'))
    const sheet = screen.getByRole('dialog', { name: 'la stazione' })
    fireEvent.click(within(sheet).getByRole('button', { name: /Elimina/ }))
    await flush()
    await flush()

    expect(fetchMock).toHaveBeenCalledWith('/api/saved-translations/s1', { method: 'DELETE' })
    expect(screen.queryByText('la stazione', { selector: '.sv-main b' })).toBeNull()
    expect(screen.getByText('2 salvate da te')).toBeTruthy()
    const bar = screen.getByRole('status')
    expect(bar.textContent).toContain('Eliminata: Deleted: la stazione')

    fireEvent.click(within(bar).getByRole('button', { name: /Annulla/ }))
    await flush()
    await flush()
    const [, restore] = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(restore.body)).toEqual({ english: 'the station', italian: 'la stazione', created_at: '2026-09-26T10:00:00Z' })
    expect(screen.getByText('3 salvate da te')).toBeTruthy()
  })

  it('puts the row back when the delete fails', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 500 })))
    renderSaved()
    fireEvent.click(screen.getByText('il binario'))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'il binario' })).getByRole('button', { name: /Elimina/ }))
    await flush()
    await flush()
    expect(screen.getByText('3 salvate da te')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Impossibile eliminare')
  })

  it('adds a row to a topic, listing path topics first, with undo', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/card') ? ok({ id: 'card1' }, 201) : Promise.resolve(new Response(null, { status: 204 })))
    renderSaved()
    fireEvent.click(screen.getByText('la stazione'))
    const sheet = screen.getByRole('dialog', { name: 'la stazione' })
    fireEvent.click(within(sheet).getByRole('button', { name: /Aggiungi a un argomento/ }))

    const choices = within(sheet).getAllByRole('button').filter(b => b.classList.contains('nm-row'))
    expect(choices.map(b => b.querySelector('b')!.textContent)).toEqual(['La città', 'Cortesia', 'Chapter 7'])

    fireEvent.click(choices[0])
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('/api/saved-translations/s1/card', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ setId: 'citta' }),
    }))
    const bar = screen.getByRole('status')
    expect(bar.textContent).toContain('Aggiunta a Added to La città')
    fireEvent.click(within(bar).getByRole('button', { name: /Annulla/ }))
    expect(fetchMock).toHaveBeenCalledWith('/api/cards/card1', { method: 'DELETE' })
  })

  it('says so when the topic already has the word', async () => {
    fetchMock.mockImplementation(() => ok({ error: 'Already in this topic', cardId: 'c0' }, 409))
    renderSaved()
    fireEvent.click(screen.getByText('la stazione'))
    const sheet = screen.getByRole('dialog', { name: 'la stazione' })
    fireEvent.click(within(sheet).getByRole('button', { name: /Aggiungi a un argomento/ }))
    fireEvent.click(within(sheet).getByText('La città'))
    await flush()
    expect(screen.getByRole('status').textContent).toContain('È già in Already in La città')
  })
})
