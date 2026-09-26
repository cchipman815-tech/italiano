import type { BackLink } from '@/lib/study'
import type { Bilingual } from '@/lib/paths'
import SubpageBar from './SubpageBar'
import NavLink from './NavLink'
import { Icon, type IconName } from './StudyIcons'
import Bi from './Bi'

/** A mode that can't start yet, with the reason and a way to turn more cards on. */
export default function StudyGate({
  setId,
  back,
  icon,
  reason,
}: {
  setId: string
  back: BackLink
  icon: IconName
  reason: Bilingual
}) {
  return (
    <div className="st-view">
      <SubpageBar back={back} />
      <div className="nm-empty">
        <span className="orb"><Icon name={icon} size={26} /></span>
        <h1 className="nm-x" style={{ fontSize: 19, fontWeight: 600, margin: '6px 0 0' }}><Bi {...reason} /></h1>
        <NavLink href={`/sets/${setId}/edit`} className="nm-ghost"><Bi k="editTopic" /></NavLink>
      </div>
    </div>
  )
}
