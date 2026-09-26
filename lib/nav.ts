/**
 * Shell routing rules: the four tabs, which tab a route belongs to, and
 * where the tab bar shows. Study screens, editors and login hide it.
 */
import type { IconName } from '@/components/StudyIcons'
import type { StringKey } from './i18n'

export type TabKey = 'oggi' | 'impara' | 'traduci' | 'salvate'

/** push: into a subpage · back: out of one · tab: between tab roots */
export type NavDirection = 'push' | 'back' | 'tab'

export interface Tab {
  key: TabKey
  href: string
  label: StringKey
  icon: IconName
}

export const TABS: Tab[] = [
  { key: 'oggi',    href: '/home',      label: 'today',     icon: 'sun' },
  { key: 'impara',  href: '/learn',     label: 'learn',     icon: 'book' },
  { key: 'traduci', href: '/translate', label: 'translate', icon: 'lang' },
  { key: 'salvate', href: '/saved',     label: 'saved',     icon: 'bookmark' },
]

const SET_DETAIL = /^\/sets\/[^/]+$/

/** The tab a route sits under, or null for routes outside the tabs. */
export function tabForPath(pathname: string): TabKey | null {
  if (pathname === '/home') return 'oggi'
  if (pathname === '/learn' || pathname.startsWith('/learn/')) return 'impara'
  if (SET_DETAIL.test(pathname)) return 'impara'
  if (pathname === '/translate') return 'traduci'
  if (pathname === '/saved') return 'salvate'
  return null
}

/** The tab bar shows on tab roots and the pages directly under Impara. */
export function showsTabBar(pathname: string): boolean {
  return tabForPath(pathname) !== null
}
