'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const USER_INITIALS: Record<string, string> = { '1': 'C', '2': 'J' }

interface Props {
  userInitial?: string
}

export default function AppNav({ userInitial: initialProp }: Props) {
  const [userInitial, setUserInitial] = useState(initialProp ?? '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!initialProp) {
      const match = document.cookie.match(/userId=(\d+)/)
      setUserInitial(match ? (USER_INITIALS[match[1]] ?? '?') : '?')
    }
  }, [initialProp])

  function handleSignOut() {
    document.cookie = 'userId=; path=/; max-age=0'
    window.location.href = '/login'
  }

  return (
    <nav className="sticky top-0 z-40 bg-white w-full" style={{ boxShadow: '0 1px 4px 0 rgba(40,46,62,0.08)' }}>
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🇮🇹</span>
          <span className="text-lg font-bold text-qz-text">Italiano</span>
        </Link>
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
    </nav>
  )
}
