import NavLink from '@/components/NavLink'
import { Icon } from '@/components/StudyIcons'
import Bi from '@/components/Bi'

/** Replaces Next's 404: points home and says the cards are safe, no error code. */
export default function NotFound() {
  return (
    <div className="st-screen nf">
      <div className="nm-empty">
        <span className="orb"><Icon name="book" size={26} /></span>
        <h2 className="nm-x"><Bi k="notFound" /></h2>
        <p className="nm-st"><Bi k="notFoundHint" /></p>
      </div>
      <div className="nm-float low">
        <NavLink href="/home" nav="tab" className="nm-cta on-ac">
          <span className="nm-st"><Bi k="backToToday" /></span>
          <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
        </NavLink>
      </div>
    </div>
  )
}
