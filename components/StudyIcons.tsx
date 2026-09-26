interface IconProps { size?: number }

export function FlashcardIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2"/>
      <path d="M8 20h8M12 18v2"/>
    </svg>
  )
}

export function ConjugationIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  )
}

export function SentenceIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

export function QuizIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

export function ListeningIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  )
}

export function ReviewIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.98"/>
    </svg>
  )
}

/* ─── Notte icons ─────────────────────────────────────────────────────────────
   The symbol set from docs/design/notte-prototype.html, drawn in currentColor.
   `filled` adds a 20% currentColor fill (active tab). */

const ICON_PATHS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
  'arrow-ne': <path d="M7 17 17 7M9 7h8v8"/>,
  speak: <><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></>,
  cards: <><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></>,
  verb: <><path d="M4 6h10M4 12h16M4 18h7"/><circle cx="18" cy="6" r="2"/></>,
  quote: <><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/></>,
  quiz: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></>,
  ear: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="5" height="6" rx="1.5"/><rect x="16" y="14" width="5" height="6" rx="1.5"/></>,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></>,
  spark: <path d="M12 3c1 4 3 6 7 7-4 1-6 3-7 8-1-5-3-7-7-8 4-1 6-3 7-7z"/>,
  check: <path d="M5 12.5 10 17l9-10"/>,
  x: <path d="M6 6l12 12M18 6 6 18"/>,
  chev: <path d="m9 6 6 6-6 6"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
  repeat: <path d="M4 12a8 8 0 0 1 14-5l2 2M20 5v4h-4M20 12a8 8 0 0 1-14 5l-2-2M4 19v-4h4"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></>,
  lang: <><path d="M3 5h10M8 3v2M5.5 5c.9 3.2 3.2 5.8 6 7.2M10.5 5c-.8 3.6-3.4 6.6-7 8"/><path d="M12.5 21l4-9 4 9M13.9 18h5.2"/></>,
  book: <><path d="M12 6.5C10 5 7.2 4.5 4 5v13c3.2-.5 6 0 8 1.5 2-1.5 4.8-2 8-1.5V5c-3.2-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>,
  bookmark: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.1"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
} as const

export type IconName = keyof typeof ICON_PATHS

interface NotteIconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  filled?: boolean
  className?: string
}

export function Icon({ name, size = 18, strokeWidth = 1.7, filled = false, className }: NotteIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : undefined}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}
