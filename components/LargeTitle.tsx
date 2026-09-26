'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/lib/paths'
import { plainText, t } from '@/lib/i18n'
import { useShell } from './Shell'
import Bi from './Bi'

/**
 * A tab root's large title under a sticky top bar. Once the title scrolls
 * under the bar, the bar turns to glass and shows the title inline. The
 * avatar on the right opens the profile sheet.
 */
export default function LargeTitle({ title, sub }: { title: Bilingual; sub?: ReactNode }) {
  const shell = useShell()
  const [collapsed, setCollapsed] = useState(false)
  const barRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const heading = titleRef.current
    if (!heading) return
    const barHeight = barRef.current?.offsetHeight ?? 44
    const io = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { rootMargin: `-${barHeight}px 0px 0px 0px` },
    )
    io.observe(heading)
    return () => io.disconnect()
  }, [])

  const user = shell?.user
  return (
    <>
      <header ref={barRef} className={`nm-top${collapsed ? ' collapsed' : ''}`}>
        <span className="w-11" aria-hidden="true" />
        <span className="inl" aria-hidden="true"><Bi {...title} /></span>
        {user ? (
          <button
            type="button"
            className="nm-av"
            aria-label={`${plainText(t('profile'), shell.prefs.imm)}: ${user.name}`}
            onClick={shell.openProfile}
          >
            <span>{user.name[0]}</span>
          </button>
        ) : (
          <span className="w-11" aria-hidden="true" />
        )}
      </header>
      <div className="nm-lt">
        <h1 ref={titleRef}><Bi {...title} /></h1>
        {sub && <small className="nm-x">{sub}</small>}
      </div>
    </>
  )
}
