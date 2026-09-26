import type { CSSProperties } from 'react'
import { plainText, t } from '@/lib/i18n'

/**
 * Loading screens: the shape of the page, not a spinner. The blocks pulse
 * once every 1.2s and stay still with reduced motion (app/edit.css).
 */
function Bone({ w, h, r, style }: { w?: string | number; h: number; r?: number; style?: CSSProperties }) {
  return <i className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function Top({ back }: { back?: boolean }) {
  return (
    <div className={`nm-top${back ? ' nm-sub collapsed' : ''}`} aria-hidden="true">
      {back ? <Bone w={96} h={14} /> : <span />}
      <span />
      {!back && <span className="nm-av"><Bone w={34} h={34} r={17} /></span>}
    </div>
  )
}

/** Mix-level label; loading screens render before the shell's preferences are at hand. */
const LOADING = plainText(t('loading'), 'mix')

/** Oggi: greeting, due readout, the Continua card, two path tiles. */
export function TodaySkeleton() {
  return (
    <div role="status" aria-label={LOADING}>
      <Top />
      <div className="sk-page">
        <Bone w="78%" h={30} />
        <Bone w="44%" h={12} />
        <div className="sk-row" style={{ marginTop: 14 }}><Bone w={74} h={64} r={14} /><Bone w={90} h={14} /></div>
        <Bone h={88} r={22} style={{ marginTop: 10 }} />
        <div className="sk-two" style={{ marginTop: 8 }}><Bone h={104} r={18} /><Bone h={104} r={18} /></div>
      </div>
    </div>
  )
}

/** A title and a list of rows: Impara, a path, Salvate, a study screen. */
export function ListSkeleton({ back, rows = 5 }: { back?: boolean; rows?: number }) {
  return (
    <div role="status" aria-label={LOADING}>
      <Top back={back} />
      <div className="sk-page">
        <Bone w="58%" h={30} />
        <Bone w="40%" h={12} />
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          {Array.from({ length: rows }, (_, i) => <Bone key={i} h={56} r={16} />)}
        </div>
      </div>
    </div>
  )
}
