import { t, type StringKey } from '@/lib/i18n'
import type { Bilingual } from '@/lib/paths'

type Props = (
  | { k: StringKey; it?: never; en?: never }
  | ({ k?: never } & Bilingual)
) & {
  /** Mix puts the English on its own line (prototype `.nm-st`). */
  stack?: boolean
  /** Mix shows only the Italian (prototype `.nm-x`); EN still switches. */
  itOnlyInMix?: boolean
  className?: string
}

/**
 * A bilingual label. Both halves render; CSS on <html data-imm> picks which
 * show, so the server output is right for every immersion level.
 */
export default function Bi({ k, it, en, stack, itOnlyInMix, className }: Props) {
  const pair = k ? t(k) : { it: it!, en: en! }
  const classes = [stack && 'nm-st', itOnlyInMix && 'nm-x', className].filter(Boolean).join(' ') || undefined

  if (pair.it === pair.en) return <span className={classes}>{pair.it}</span>

  return (
    <span className={classes}>
      <span className="nm-it" lang="it">{pair.it}</span>
      <span className="nm-en">{pair.en}</span>
    </span>
  )
}
