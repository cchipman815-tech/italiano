import { describe, it, expect } from 'vitest'
import { TABS, showsTabBar, tabForPath } from '@/lib/nav'

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

  it.each(['/login', '/sets/new', '/sets/abc/quiz', '/sets/abc/edit', '/review', '/'])('%s has no tab', path => {
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
