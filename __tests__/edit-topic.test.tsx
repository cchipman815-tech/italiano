import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import Shell from '@/components/Shell'
import EditTopic from '@/components/EditTopic'
import NewTopicSheet from '@/components/NewTopicSheet'
import type { Card } from '@/lib/types'

vi.mock('next/navigation', () => ({
  usePathname: () => '/sets/are/edit',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  // Reduced motion: no waits for fades.
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  fetchMock.mockReset()
  globalThis.fetch = fetchMock
})

const PARLARE = { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' }

function card(id: string, extra: Partial<Card> = {}): Card {
  return { id, set_id: 'are', italian: id, english: `to ${id}`, sort_order: 0, conjugations: null, enabled: true, chapter: 1, ...extra }
}

const cards = [
  card('parlare', { conjugations: { present: PARLARE, off: ['noi', 'voi', 'loro'] }, sort_order: 1 }),
  card('mangiare', { sort_order: 2 }),
]

function renderEdit(initial = cards) {
  return render(
    <Shell user={{ id: 1, name: 'Chance' }} initialPrefs={{ theme: 'notte', imm: 'mix', layout: 'mobile' }}>
      <EditTopic topic={{ id: 'are', title: 'Verbi in -are', category: 'verbs' }} initialCards={initial} chapter={null} />
    </Shell>,
  )
}

const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const row = (id: string) => document.querySelector(`[data-card="${id}"]`) as HTMLElement

describe('Modifica argomento', () => {
  it('shows each verb’s forms as "3/6 attive" and the topic’s counts', () => {
    renderEdit()
    expect(within(row('parlare')).getByText('3/6 attive')).toBeTruthy()
    expect(screen.getByText('2 carte · 2 attive · cap. 1')).toBeTruthy()
  })

  it('switches a card off and saves it', async () => {
    fetchMock.mockReturnValue(ok({}))
    renderEdit()
    fireEvent.click(within(row('mangiare')).getByRole('switch', { name: /In ripasso.*: mangiare/ }))
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('/api/cards/mangiare', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ enabled: false }) }))
    expect(row('mangiare').classList.contains('off')).toBe(true)
    expect(screen.getByText('2 carte · 1 attiva · cap. 1')).toBeTruthy()
  })

  it('turns a form on, keeping the others off', async () => {
    fetchMock.mockReturnValue(ok({}))
    renderEdit()
    fireEvent.click(row('parlare').querySelector('.ed-open')!)
    fireEvent.click(within(row('parlare')).getByRole('switch', { name: /Attiva · On: parliamo/ }))
    await flush()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.conjugations.off).toEqual(['voi', 'loro'])
    expect(within(row('parlare')).getByText('4/6 attive')).toBeTruthy()
  })

  it('rolls a failed save back and says so', async () => {
    fetchMock.mockReturnValue(ok({ error: 'nope' }, 500))
    renderEdit()
    fireEvent.click(within(row('mangiare')).getByRole('switch', { name: /mangiare/ }))
    await flush()
    expect(row('mangiare').classList.contains('off')).toBe(false)
    expect(screen.getByRole('status').textContent).toContain('Impossibile salvare')
  })

  it('asks inline before deleting, then offers Annulla, which restores the snapshot', async () => {
    const snapshot = { card: cards[1], progress: [], conjugationProgress: [] }
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? ok(snapshot) : ok(cards[1], 201))
    renderEdit()
    const r = row('mangiare')
    fireEvent.click(r.querySelector('.ed-open')!)
    fireEvent.click(within(r).getByRole('button', { name: /Elimina/ }))
    expect(within(r).getByText('Eliminare la carta?')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(within(r).getByRole('button', { name: /Elimina carta/ }))
    // The row fades out over --d-small before it goes.
    await act(async () => { await new Promise(res => setTimeout(res, 300)) })
    expect(fetchMock).toHaveBeenCalledWith('/api/cards/mangiare', { method: 'DELETE' })
    expect(row('mangiare')).toBeNull()
    const bar = screen.getByRole('status')
    expect(bar.textContent).toMatch(/^Carta eliminata: .*mangiare/)

    fireEvent.click(within(bar).getByRole('button', { name: /Annulla/ }))
    await flush()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/cards/restore', expect.objectContaining({ method: 'POST', body: JSON.stringify(snapshot) }))
    expect(row('mangiare')).toBeTruthy()
  })

  it('asks before deleting the topic, and Annulla there keeps it', () => {
    renderEdit()
    fireEvent.click(screen.getByRole('button', { name: /Elimina argomento/ }))
    expect(screen.getByText(/Eliminare “Verbi in -are” e le sue carte\?/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: /Annulla/ })[0])
    expect(screen.queryByText(/Eliminare “Verbi in -are”/)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the empty state for a new topic', () => {
    renderEdit([])
    expect(screen.getByText('Nessuna carta ancora')).toBeTruthy()
  })
})

describe('Nuovo argomento', () => {
  function renderNew() {
    return render(
      <Shell user={{ id: 1, name: 'Chance' }} initialPrefs={{ theme: 'notte', imm: 'mix', layout: 'mobile' }}>
        <NewTopicSheet path="frasi" chapters={[1, 2, 3]} />
      </Shell>,
    )
  }

  it('needs a name, and creates the topic in the chosen path', async () => {
    fetchMock.mockReturnValue(ok({ id: 'new-topic' }, 201))
    renderNew()
    fireEvent.click(screen.getByRole('button', { name: /Nuovo argomento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nuovo argomento' })
    fireEvent.click(within(dialog).getByRole('button', { name: /Crea argomento/ }))
    expect(within(dialog).getByText("Dai un nome all'argomento.")).toBeTruthy()
    expect(within(dialog).getByLabelText(/Nome/).getAttribute('aria-invalid')).toBe('true')
    expect(fetchMock).not.toHaveBeenCalled()

    expect(within(dialog).getByRole('button', { name: /Frasi/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(dialog).getByRole('button', { name: /Parole/ }))
    fireEvent.change(within(dialog).getByLabelText(/Nome/), { target: { value: 'Al mercato' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /Crea argomento/ }))
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('/api/sets', expect.objectContaining({ body: JSON.stringify({ title: 'Al mercato', category: 'nouns' }) }))
  })
})
