import type { BackLink } from '@/lib/study'
import type { ReactNode } from 'react'
import SubpageBar from './SubpageBar'

/** A study screen's top: the labeled back button, a count, and the Ambra progress line. */
export default function StudyTop({
  back,
  count,
  progress,
}: {
  back: BackLink
  count?: ReactNode
  /** 0–1. */
  progress?: number
}) {
  return (
    <>
      <SubpageBar back={back} trailing={count} />
      {progress != null && (
        <div className="nm-prog" aria-hidden="true">
          <i style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }} />
        </div>
      )}
    </>
  )
}
