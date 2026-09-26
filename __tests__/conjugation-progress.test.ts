import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

/** Just enough of the Supabase query builder for the route: select/eq, maybeSingle, upsert. */
const fake = vi.hoisted(() => {
  const state = {
    userId: 1 as number | null,
    tables: {} as Record<string, Row[]>,
    upserts: [] as { table: string; row: Row; onConflict?: string }[],
  }
  function from(table: string) {
    const filters: [string, unknown][] = []
    const rows = () => (state.tables[table] ?? []).filter(r => filters.every(([k, v]) => r[k] === v))
    const builder = {
      select: () => builder,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return builder },
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      upsert: async (row: Row, opts?: { onConflict?: string }) => {
        state.upserts.push({ table, row, onConflict: opts?.onConflict })
        return { error: null }
      },
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

const { POST } = await import('@/app/api/conjugation-progress/route')

const call = (body: unknown) =>
  POST(new Request('http://x/api/conjugation-progress', { method: 'POST', body: JSON.stringify(body) }))

const PARLARE = { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-26T12:00:00Z'))
  fake.state.userId = 1
  fake.state.upserts = []
  fake.state.tables = {
    cards: [
      { id: 'parlare', conjugations: { present: PARLARE } },
      { id: 'casa', conjugations: null },
    ],
    conjugation_progress: [
      { user_id: 1, card_id: 'parlare', tense: 'present', pronoun: 'noi', interval: 6, ease_factor: 2.5, repetitions: 2, next_review_at: '2026-09-26' },
      { user_id: 2, card_id: 'parlare', tense: 'present', pronoun: 'io', interval: 6, ease_factor: 2.5, repetitions: 2, next_review_at: '2026-09-26' },
    ],
  }
})

describe('POST /api/conjugation-progress', () => {
  it('schedules a first right answer for tomorrow, keyed on the form', async () => {
    const res = await call({ cardId: 'parlare', pronoun: 'io', known: true })
    expect(res.status).toBe(204)
    expect(fake.state.upserts).toHaveLength(1)
    expect(fake.state.upserts[0]).toMatchObject({
      table: 'conjugation_progress',
      onConflict: 'user_id,card_id,tense,pronoun',
      row: { user_id: 1, card_id: 'parlare', tense: 'present', pronoun: 'io', known: true, interval: 1, repetitions: 1, next_review_at: '2026-09-27' },
    })
  })

  it('builds on the form’s existing SRS state (and only the caller’s)', async () => {
    await call({ cardId: 'parlare', pronoun: 'noi', known: true })
    expect(fake.state.upserts[0].row).toMatchObject({ interval: 15, repetitions: 3, next_review_at: '2026-10-11' })
  })

  it('resets a missed form to tomorrow and lowers its ease', async () => {
    await call({ cardId: 'parlare', pronoun: 'noi', known: false })
    expect(fake.state.upserts[0].row).toMatchObject({ known: false, interval: 1, repetitions: 0, ease_factor: 2.3, next_review_at: '2026-09-27' })
  })

  it('needs a signed-in user', async () => {
    fake.state.userId = null
    expect((await call({ cardId: 'parlare', pronoun: 'io', known: true })).status).toBe(401)
    expect(fake.state.upserts).toEqual([])
  })

  it('rejects a bad body, an unknown pronoun, an unknown card and a card with no such form', async () => {
    expect((await call({ cardId: 'parlare', pronoun: 'io' })).status).toBe(400)
    expect((await call({ cardId: 'parlare', pronoun: 'egli', known: true })).status).toBe(400)
    expect((await call({ cardId: 'nope', pronoun: 'io', known: true })).status).toBe(404)
    expect((await call({ cardId: 'casa', pronoun: 'io', known: true })).status).toBe(400)
    expect(fake.state.upserts).toEqual([])
  })
})
