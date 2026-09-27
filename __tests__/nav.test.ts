import { describe, it, expect } from 'vitest'
import { TABS, isMissingRoute, showsTabBar, tabForPath } from '@/lib/nav'

describe('TABS', () => {
  it('lists Oggi, Impara, Traduci, Salvate in order', () => {
    expect(TABS.map(t => [t.key, t.href])).toEqual([
      ['oggi', '/home'],
      ['impara', '/learn'],
      ['traduci', '/translate'],
      ['salvate', '/saved'],
    ])
  })
})

describe('tabForPath', () => {
  it.each([
    ['/home', 'oggi'],
    ['/learn', 'impara'],
    ['/learn/verbi', 'impara'],
    ['/sets/abc', 'impara'],
    ['/translate', 'traduci'],
    ['/saved', 'salvate'],
  ])('%s → %s', (path, tab) => {
    expect(tabForPath(path)).toBe(tab)
  })

  it.each(['/login', '/sets/abc/quiz', '/sets/abc/edit', '/review', '/'])('%s has no tab', path => {
    expect(tabForPath(path)).toBeNull()
  })
})

describe('showsTabBar', () => {
  it('shows on tab roots and path pages, hides on study, edit and login', () => {
    expect(showsTabBar('/home')).toBe(true)
    expect(showsTabBar('/sets/abc')).toBe(true)
    expect(showsTabBar('/sets/abc/flashcard')).toBe(false)
    expect(showsTabBar('/sets/abc/edit')).toBe(false)
    expect(showsTabBar('/login')).toBe(false)
  })
})

describe('isMissingRoute', () => {
  const id = '43294d4a-6aa0-4f67-8c05-e65aac548910'

  it.each(['/learn/nope', '/learn/nope/x', '/sets/abc', '/sets/abc/quiz', '/sets/123/edit'])('%s cannot exist', path => {
    expect(isMissingRoute(path)).toBe(true)
  })

  it.each(['/home', '/learn', '/learn/verbi', '/learn/parole', `/sets/${id}`, `/sets/${id}/flashcard`, '/nope'])('%s is left to the app', path => {
    expect(isMissingRoute(path)).toBe(false)
  })
})
