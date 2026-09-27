import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

/** Just enough of the Supabase query builder for the route: select/eq, single, upsert. */
const fake = vi.hoisted(() => {
  const state = {
    userId: 1 as number | null,
    today: '2026-09-26',
    progress: [] as Row[],
    upserts: [] as { row: Row; onConflict?: string }[],
  }
  function from() {
    const filters: [string, unknown][] = []
    const builder = {
      select: () => builder,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return builder },
      single: async () => ({ data: state.progress.find(r => filters.every(([k, v]) => r[k] === v)) ?? null, error: null }),
      upsert: async (row: Row, opts?: { onConflict?: string }) => {
        state.upserts.push({ row, onConflict: opts?.onConflict })
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
  getToday: async () => fake.state.today,
}))

const { POST } = await import('@/app/api/progress/route')

const call = (body: unknown) =>
  POST(new Request('http://x/api/progress', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T01:30:00Z')) // 18:30 on the 26th in Los Angeles
  fake.state.userId = 1
  fake.state.today = '2026-09-26'
  fake.state.upserts = []
  fake.state.progress = [
    { user_id: 1, card_id: 'casa', interval: 6, ease_factor: 2.5, repetitions: 2, next_review_at: '2026-09-26' },
  ]
})

describe('POST /api/progress', () => {
  it('schedules from the learner’s today, not the server’s UTC date', async () => {
    expect((await call({ cardId: 'libro', known: true })).status).toBe(204)
    expect(fake.state.upserts[0]).toMatchObject({
      onConflict: 'user_id,card_id',
      row: { user_id: 1, card_id: 'libro', known: true, interval: 1, repetitions: 1, next_review_at: '2026-09-27' },
    })
  })

  it('builds on the card’s SRS state', async () => {
    await call({ cardId: 'casa', known: true })
    expect(fake.state.upserts[0].row).toMatchObject({ interval: 15, repetitions: 3, next_review_at: '2026-10-11' })
    await call({ cardId: 'casa', known: false })
    expect(fake.state.upserts[1].row).toMatchObject({ interval: 1, repetitions: 0, ease_factor: 2.3, next_review_at: '2026-09-27' })
  })

  it('needs a signed-in user', async () => {
    fake.state.userId = null
    expect((await call({ cardId: 'casa', known: true })).status).toBe(401)
    expect(fake.state.upserts).toEqual([])
  })
})
