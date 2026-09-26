import type { ReactNode } from 'react'
import type { Bilingual } from '@/lib/paths'
import { Icon } from './StudyIcons'
import Bi from './Bi'
import NavLink from './NavLink'

/** Top bar for subpages: a labeled back button, and optional trailing content (e.g. "1 / 20"). */
export default function SubpageBar({
  back,
  trailing,
}: {
  back: { href: string; label: Bilingual | string }
  trailing?: ReactNode
}) {
  return (
    <header className="nm-top nm-sub collapsed">
      <NavLink href={back.href} nav="back" className="nm-back">
        <Icon name="chev" size={18} strokeWidth={2.2} />
        {typeof back.label === 'string' ? <span>{back.label}</span> : <Bi {...back.label} itOnlyInMix />}
      </NavLink>
      {trailing && <span className="cnt">{trailing}</span>}
    </header>
  )
}
