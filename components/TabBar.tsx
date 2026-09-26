'use client'
import { TABS, type TabKey } from '@/lib/nav'
import { plainText, t } from '@/lib/i18n'
import { Icon } from './StudyIcons'
import Bi from './Bi'
import NavLink from './NavLink'
import { useShell } from './Shell'

/**
 * Glass tab bar: 4 tabs and a pill that slides to the active one. Slides away
 * on screens without tabs (study, edit, login) and is inert while hidden.
 */
export default function TabBar({ active, visible }: { active: TabKey | null; visible: boolean }) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const index = Math.max(0, TABS.findIndex(tab => tab.key === active))

  return (
    <nav
      className={`nm-tabs glass${visible ? '' : ' away'}`}
      aria-label={plainText(t('tabs'), imm)}
      inert={!visible}
    >
      <span className="pill" aria-hidden="true" style={{ translate: `${index * 100}% 0` }} />
      {TABS.map(tab => {
        const on = tab.key === active
        return (
          <NavLink
            key={tab.key}
            href={tab.href}
            nav="tab"
            className={`nm-tab${on ? ' on' : ''}`}
            aria-current={on ? 'page' : undefined}
          >
            <Icon name={tab.icon} size={21} strokeWidth={1.8} filled={on} />
            <Bi k={tab.label} itOnlyInMix />
          </NavLink>
        )
      })}
    </nav>
  )
}
