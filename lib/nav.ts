/**
 * Shell routing rules: the four tabs, which tab a route belongs to, and
 * where the tab bar shows. Study screens, editors and login hide it.
 */
import type { IconName } from '@/components/StudyIcons'
import type { StringKey } from './i18n'
import { isPathSlug } from './paths'

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

const PATH_PAGE = /^\/learn\/([^/]+)/
const TOPIC_PAGE = /^\/sets\/([^/]+)/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Routes that can't exist, known without the database: a path that isn't one
 * of the four, or a topic id that isn't a uuid. proxy.ts answers these with a
 * real 404; the loading screens would otherwise start a 200 response before
 * the page calls notFound().
 */
export function isMissingRoute(pathname: string): boolean {
  const path = PATH_PAGE.exec(pathname)?.[1]
  if (path !== undefined) return !isPathSlug(decodeURIComponent(path))
  const topic = TOPIC_PAGE.exec(pathname)?.[1]
  if (topic !== undefined) return !UUID.test(topic)
  return false
}
