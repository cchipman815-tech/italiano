'use client'
import {
  useEffect,
  useEffectEvent,
  useRef,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { tokenMs } from '@/lib/motion'

const FOCUSABLE = 'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), .nm-scrl button:not([disabled]), button:not([disabled]), a[href]'
const DISMISS_FRACTION = 0.3

const subscribeNever = () => () => {}

/**
 * A bottom sheet over a dim. It rises over --d-medium (decel) and leaves over
 * --d-small (accel). Dismiss by dragging the grab zone past 30% of the
 * visible height, tapping the dim, or pressing Escape. While open, the page
 * behind is inert and focus moves in; on close it returns to the trigger.
 * Children with class `sr` stagger in on the first open only.
 */
export default function Sheet({
  open,
  onClose,
  label,
  header,
  children,
  detents = [0.76],
}: {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog. */
  label: string
  /** Rendered in the grab zone under the handle, so dragging it moves the sheet. */
  header?: ReactNode
  children: ReactNode
  /** Heights as fractions of the viewport. The sheet opens at the first and snaps to the nearest. */
  detents?: number[]
}) {
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const openedOnce = useRef(false)
  const detent = useRef(0)
  const drag = useRef({ active: false, y0: 0, dy: 0 })
  const tallest = Math.max(...detents)

  const close = useEffectEvent(() => onClose())

  /** Translate (px) that shows detent i: the sheet is `tallest` high, smaller detents sit lower. */
  function offsetFor(i: number) {
    return (tallest - detents[i]) * window.innerHeight
  }

  useEffect(() => {
    const sheet = sheetRef.current
    if (!open || !sheet) return

    const returnTo = document.activeElement as HTMLElement | null
    const rows = sheet.querySelectorAll<HTMLElement>('.sr')
    rows.forEach((row, k) => {
      row.style.transitionDelay = openedOnce.current ? '0s' : `calc(var(--stagger) * ${k + 2})`
    })
    openedOnce.current = true
    detent.current = 0
    sheet.style.translate = `0 ${offsetFor(0)}px`

    const background = document.querySelectorAll<HTMLElement>('[data-shell-bg]')
    background.forEach(el => { el.inert = true })
    document.documentElement.classList.add('sheet-open')

    const focusTimer = setTimeout(() => {
      sheet.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
    }, tokenMs('--d-medium', 400))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      background.forEach(el => { el.inert = false })
      document.documentElement.classList.remove('sheet-open')
      rows.forEach(row => { row.style.transitionDelay = '0s' })
      sheet.style.translate = ''
      returnTo?.focus({ preventScroll: true })
    }
    // offsetFor reads the detents prop; re-running on its identity would re-focus mid-open.
    // isClient: a sheet that starts open has no element until the portal mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isClient])

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, a, input')) return
    drag.current = { active: true, y0: e.clientY, dy: 0 }
    sheetRef.current?.classList.add('dragging')
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const sheet = sheetRef.current
    if (!drag.current.active || !sheet) return
    drag.current.dy = e.clientY - drag.current.y0
    let y = offsetFor(detent.current) + drag.current.dy
    if (y < 0) y *= 0.2 // resist past the tallest detent
    sheet.style.translate = `0 ${y}px`
  }

  function onPointerEnd() {
    const sheet = sheetRef.current
    if (!drag.current.active || !sheet) return
    drag.current.active = false
    sheet.classList.remove('dragging')

    const { dy } = drag.current
    const visible = detents[detent.current] * window.innerHeight
    if (dy > visible * DISMISS_FRACTION && detent.current === 0) {
      onClose()
      return
    }
    // Settle on the nearest detent.
    const y = offsetFor(detent.current) + dy
    let nearest = 0
    detents.forEach((_, i) => {
      if (Math.abs(offsetFor(i) - y) < Math.abs(offsetFor(nearest) - y)) nearest = i
    })
    if (dy > visible * DISMISS_FRACTION && nearest === detent.current) {
      onClose()
      return
    }
    detent.current = nearest
    sheet.style.transition = 'translate var(--d-medium) var(--e-decel)'
    sheet.style.translate = `0 ${offsetFor(nearest)}px`
    setTimeout(() => { sheet.style.transition = '' }, tokenMs('--d-medium', 400))
  }

  if (!isClient) return null

  return createPortal(
    <>
      <div className={`p-dim${open ? ' on' : ''}`} aria-hidden="true" onClick={onClose} />
      <div
        ref={sheetRef}
        className={`p-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        inert={!open}
        style={{ height: `${tallest * 100}dvh` }}
      >
        <div
          className="grabzone"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div className="nm-grab" />
          {header}
        </div>
        {children}
      </div>
    </>,
    document.body,
  )
}
