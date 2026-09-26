'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'

const USER_INITIALS: Record<string, string> = { '1': 'C', '2': 'J' }

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STANDALONE_QUERY = '(display-mode: standalone)'

const subscribeNever = () => () => {}

function readUserInitial() {
  const match = document.cookie.match(/userId=(\d+)/)
  return match ? (USER_INITIALS[match[1]] ?? '?') : '?'
}

function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const readStandalone = () => window.matchMedia(STANDALONE_QUERY).matches

interface Props {
  userInitial?: string
}

export default function AppNav({ userInitial: initialProp }: Props) {
  const cookieInitial = useSyncExternalStore(subscribeNever, readUserInitial, () => '')
  const userInitial = initialProp ?? cookieInitial
  const [open, setOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // Don't show install button if already running as installed app
  const isStandalone = useSyncExternalStore(subscribeStandalone, readStandalone, () => false)

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => setInstallPrompt(null)

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  function handleSignOut() {
    document.cookie = 'userId=; path=/; max-age=0'
    window.location.href = '/login'
  }

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <nav className="sticky top-0 z-40 bg-white w-full" style={{ boxShadow: '0 1px 4px 0 rgba(40,46,62,0.08)' }}>
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🇮🇹</span>
          <span className="text-lg font-bold text-qz-text">Italiano</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Install button — only visible when Chrome has queued an install prompt */}
          {installPrompt && !isStandalone && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-qz-blue border-2 border-qz-blue rounded-full hover:bg-qz-blue-light transition-colors cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Install app
            </button>
          )}

          {userInitial && (
            <div className="relative">
              <button
                onClick={() => setOpen(o => !o)}
                className="w-9 h-9 rounded-full bg-qz-blue text-white font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-qz-blue-dark transition-colors select-none"
              >
                {userInitial}
              </button>
              {open && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <div
                    className="absolute right-0 top-11 z-20 bg-white border border-qz-border rounded-xl py-1 min-w-[140px]"
                    style={{ boxShadow: 'var(--qz-shadow-card)' }}
                  >
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-qz-text hover:bg-qz-subtle transition-colors cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
