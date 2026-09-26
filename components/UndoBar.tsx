'use client'
import { plainText, t } from '@/lib/i18n'
import type { UndoRequest } from './Shell'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Bi from './Bi'

/**
 * Bottom glass bar with a message and an Undo action. It stays until it is
 * dismissed or the user navigates away (the shell handles both). Always in
 * the DOM as a live region so each new message is announced.
 */
export default function UndoBar({
  request,
  open,
  raised,
  onDismiss,
}: {
  request: UndoRequest | null
  open: boolean
  /** Sits above the tab bar when it shows. */
  raised: boolean
  onDismiss: () => void
}) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const action = request?.action ?? t('undo')

  return (
    <div
      className={`p-toast glass nm-x${open ? ' on' : ''}${raised ? ' raised' : ''}`}
      role="status"
      inert={!open}
    >
      {request && (
        <>
          <span className="msg">{request.message}</span>
          {request.onAction && (
            <button
              type="button"
              className="link-btn"
              onClick={() => { request.onAction?.(); onDismiss() }}
            >
              <Bi {...action} />
            </button>
          )}
          <button type="button" className="x" aria-label={plainText(t('dismiss'), imm)} onClick={onDismiss}>
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>
        </>
      )}
    </div>
  )
}
