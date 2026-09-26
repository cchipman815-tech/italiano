import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

/** Just enough of the Supabase query builder for the route: select/eq, maybeSingle, insert().select().single(). */
const fake = vi.hoisted(() => {
  const state = { userId: 1 as number | null, tables: {} as Record<string, Row[]>, inserted: [] as Row[] }
  function from(table: string) {
    const filters: [string, unknown][] = []
    let insert: Row | null = null
    const rows = () => (state.tables[table] ?? []).filter(r => filters.every(([k, v]) => r[k] === v))
    const builder = {
      select: () => builder,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return builder },
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      insert: (row: Row) => { insert = row; return builder },
      single: async () => {
        const row = { id: 'new-card', ...insert }
        state.inserted.push(row)
        return { data: row, error: null }
      },
      then: (resolve: (r: { data: Row[]; error: null }) => void) => resolve({ data: rows(), error: null }),
    }
    return builder
  }
  return { state, client: { from } }
})

vi.mock('@/lib/supabase', () => ({ createServerClient: () => fake.client }))
vi.mock('@/lib/api-helpers', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api-helpers')>()),
  getUserIdFromCookie: async () => fake.state.userId,
}))

const { POST } = await import('@/app/api/saved-translations/[id]/card/route')

function call(id: string, body: unknown) {
  return POST(
    new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  )
}

beforeEach(() => {
  fake.state.userId = 1
  fake.state.inserted = []
  fake.state.tables = {
    saved_translations: [
      { id: 'mine', user_id: 1, italian: 'la stazione', english: 'the station' },
      { id: 'hers', user_id: 2, italian: 'il mercato', english: 'the market' },
      { id: 'long', user_id: 1, italian: 'a'.repeat(301), english: 'long' },
    ],
    sets: [
      { id: 'citta', category: 'nouns' },
      { id: 'cortesia', category: 'phrases' },
    ],
    cards: [
      { id: 'c1', set_id: 'citta', italian: 'museo', sort_order: 4 },
      { id: 'c2', set_id: 'cortesia', italian: 'la stazione', sort_order: 0 },
    ],
  }
})

describe('POST /api/saved-translations/[id]/card', () => {
  it('creates the card at the end of the topic, article split out in Parole', async () => {
    const res = await call('mine', { setId: 'citta' })
    expect(res.status).toBe(201)
    expect(fake.state.inserted[0]).toMatchObject({
      set_id: 'citta', italian: 'stazione', english: 'the station', article: 'la', gender: 'f',
      word_type: 'noun', sort_order: 5, enabled: true,
    })
  })

  it('only uses the caller’s own saved translations', async () => {
    expect((await call('hers', { setId: 'citta' })).status).toBe(404)
    fake.state.userId = null
    expect((await call('mine', { setId: 'citta' })).status).toBe(401)
    expect(fake.state.inserted).toEqual([])
  })

  it('rejects a missing topic, an unknown topic and text too long for a card', async () => {
    expect((await call('mine', {})).status).toBe(400)
    expect((await call('mine', { setId: 'nope' })).status).toBe(404)
    expect((await call('long', { setId: 'citta' })).status).toBe(400)
    expect(fake.state.inserted).toEqual([])
  })

  it('returns 409 with the existing card when the topic already has it', async () => {
    const res = await call('mine', { setId: 'cortesia' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ cardId: 'c2' })
  })
})
