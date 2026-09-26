'use client'
import { plainText, t } from '@/lib/i18n'
import type { Immersion, Theme } from '@/lib/prefs'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Sheet from './Sheet'
import Bi from './Bi'

/** Switching user and signing out both clear the session and return to "Chi studia?". */
function leave() {
  document.cookie = 'userId=; path=/; max-age=0; SameSite=Lax'
  window.location.href = '/login'
}

const THEMES: { value: Theme; label: string; icon: 'sun' | 'moon' }[] = [
  { value: 'giorno', label: 'Giorno', icon: 'sun' },
  { value: 'notte', label: 'Notte', icon: 'moon' },
]

const LEVELS: { value: Immersion; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'mix', label: 'Mix' },
  { value: 'it', label: 'IT' },
]

/** Profile: appearance, Italian level, desktop version, install, switch user, sign out. */
export default function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shell = useShell()
  if (!shell?.user) return null
  const { user, prefs, updatePref, canInstall, install } = shell
  const desktop = prefs.layout === 'desktop'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={`${plainText(t('profile'), prefs.imm)}: ${user.name}`}
      detents={[0.76]}
      header={
        <div className="nm-me">
          <span className="nm-av" aria-hidden="true"><span>{user.name[0]}</span></span>
          <div>
            <b>{user.name}</b>
            <small className="nm-x"><Bi k="studyingNow" /></small>
          </div>
          <button type="button" className="nm-me-sw" onClick={leave}>
            <Bi k="switch" />
          </button>
        </div>
      }
    >
      <div className="nm-pref sr">
        <span><Bi k="appearance" /></span>
        <div className="nm-seg" role="group" aria-label={plainText(t('appearance'), prefs.imm)}>
          {THEMES.map(theme => (
            <button
              key={theme.value}
              type="button"
              aria-pressed={prefs.theme === theme.value}
              onClick={() => updatePref('theme', theme.value)}
            >
              <Icon name={theme.icon} size={16} strokeWidth={1.9} />
              <span lang="it">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="nm-pref sr">
        <span><Bi k="howMuchItalian" /></span>
        <div className="nm-seg" role="group" aria-label={plainText(t('howMuchItalian'), prefs.imm)}>
          {LEVELS.map(level => (
            <button
              key={level.value}
              type="button"
              aria-pressed={prefs.imm === level.value}
              onClick={() => updatePref('imm', level.value)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div className="nm-pref sr">
        <button
          type="button"
          className="nm-tog"
          role="switch"
          aria-checked={desktop}
          onClick={() => updatePref('layout', desktop ? 'mobile' : 'desktop')}
        >
          <span className="nm-st">
            <Bi k="desktopVersion" />
            <small>Wider layout with a side rail</small>
          </span>
          <span className="nm-sw2" />
        </button>
      </div>

      {canInstall && (
        <button type="button" className="nm-out sr" onClick={install}>
          <Icon name="download" size={17} strokeWidth={1.9} />
          <Bi k="installApp" />
        </button>
      )}

      <button type="button" className="nm-out sr" onClick={leave}>
        <Bi k="signOut" />
      </button>
    </Sheet>
  )
}
