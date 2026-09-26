'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { setPref, type PrefKey, type PrefValue, type Prefs } from '@/lib/prefs'
import { showsTabBar, tabForPath, type NavDirection } from '@/lib/nav'
import { TZ_COOKIE } from '@/lib/time'
import type { Bilingual } from '@/lib/paths'
import TabBar from './TabBar'
import UndoBar from './UndoBar'
import ProfileSheet from './ProfileSheet'

export interface ShellUser {
  id: number
  name: string
}

export interface UndoRequest {
  message: ReactNode
  /** Defaults to Annulla · Undo. */
  action?: Bilingual
  onAction?: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface ShellValue {
  user: ShellUser | null
  prefs: Prefs
  updatePref: <K extends PrefKey>(key: K, value: PrefValue<K>) => void
  /** Client navigation wrapped in a view transition where supported. */
  navigate: (href: string, direction?: NavDirection) => void
  openProfile: () => void
  showUndo: (request: UndoRequest) => void
  dismissUndo: () => void
  canInstall: boolean
  install: () => void
}

const ShellContext = createContext<ShellValue | null>(null)

/** Shell state for components under the root layout; null outside it (e.g. tests). */
export function useShell(): ShellValue | null {
  return useContext(ShellContext)
}

const STANDALONE_QUERY = '(display-mode: standalone)'
function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const readStandalone = () => window.matchMedia(STANDALONE_QUERY).matches

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { ready: Promise<void>; finished: Promise<void> }
}

export default function Shell({
  user,
  initialPrefs,
  children,
}: {
  user: ShellUser | null
  initialPrefs: Prefs
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [prefs, setPrefs] = useState(initialPrefs)
  const [profileOpen, setProfileOpen] = useState(false)
  const [undo, setUndo] = useState<{ request: UndoRequest; path: string; open: boolean } | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const isStandalone = useSyncExternalStore(subscribeStandalone, readStandalone, () => false)

  // ── navigation: the view transition waits until the new route has rendered ──
  const pendingNav = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    pendingNav.current?.()
    pendingNav.current = null
  }, [pathname])

  const navigate = useCallback((href: string, direction: NavDirection = 'push') => {
    const target = new URL(href, window.location.href)
    if (target.pathname + target.search === window.location.pathname + window.location.search) return

    const doc = document as ViewTransitionDocument
    if (!doc.startViewTransition || target.pathname === window.location.pathname) {
      router.push(href)
      return
    }
    const root = document.documentElement
    root.dataset.nav = direction
    const transition = doc.startViewTransition(() => new Promise<void>(resolve => {
      pendingNav.current = resolve
      router.push(href)
      setTimeout(resolve, 3000) // never hold the old screen longer than this
    }))
    // A browser may skip the animation (say, the tab is hidden); navigation still happens.
    transition.ready.catch(() => {})
    transition.finished.catch(() => {}).finally(() => { delete root.dataset.nav })
  }, [router])

  // ── time zone: Oggi's greeting and date are worded in the browser's zone ──
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (zone && !document.cookie.includes(`${TZ_COOKIE}=${encodeURIComponent(zone)}`)) {
      document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; SameSite=Lax`
    }
  }, [])

  // ── install prompt (taken over from AppNav) ──
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }, [installPrompt])

  const updatePref = useCallback(<K extends PrefKey>(key: K, value: PrefValue<K>) => {
    setPref(key, value)
    setPrefs(p => ({ ...p, [key]: value }))
  }, [])

  // The undo bar belongs to the screen it was raised on: navigating away hides it.
  const showUndo = useCallback((request: UndoRequest) => {
    setUndo({ request, path: pathname, open: true })
  }, [pathname])
  const dismissUndo = useCallback(() => {
    setUndo(u => (u ? { ...u, open: false } : u))
  }, [])

  const openProfile = useCallback(() => setProfileOpen(true), [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])

  const tabsVisible = Boolean(user) && showsTabBar(pathname)
  const value = useMemo<ShellValue>(() => ({
    user,
    prefs,
    updatePref,
    navigate,
    openProfile,
    showUndo,
    dismissUndo,
    canInstall: Boolean(installPrompt) && !isStandalone,
    install,
  }), [user, prefs, updatePref, navigate, openProfile, showUndo, dismissUndo, installPrompt, isStandalone, install])

  return (
    <ShellContext.Provider value={value}>
      <div id="shell-content" data-shell-bg className={tabsVisible ? 'shell-has-tabs' : undefined}>
        {children}
      </div>
      {user && (
        <div data-shell-bg>
          <TabBar active={tabForPath(pathname)} visible={tabsVisible} />
        </div>
      )}
      <UndoBar
        request={undo?.request ?? null}
        open={Boolean(undo?.open && undo.path === pathname)}
        raised={tabsVisible}
        onDismiss={dismissUndo}
      />
      {user && <ProfileSheet open={profileOpen} onClose={closeProfile} />}
    </ShellContext.Provider>
  )
}
