'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { PATHS, type PathSlug } from '@/lib/paths'
import { plainText, t } from '@/lib/i18n'
import LargeTitle from './LargeTitle'
import NavLink from './NavLink'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'
import Bi from './Bi'

export interface ImparaPath {
  slug: PathSlug
  active: number
  due: number
  /** Enabled cards per Prego chapter. */
  chapters: Record<number, number>
}

function countFor(path: ImparaPath, cap: number | null) {
  return cap == null ? path.active : path.chapters[cap] ?? 0
}

function tokenMs(name: string, fallback: number) {
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(ms) ? ms : fallback
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Impara: the four paths, filterable by Prego chapter. Cards with nothing in
 * the chosen chapter fade out, and the rest slide to their new places (FLIP).
 */
export default function ImparaView({ paths, chapters }: { paths: ImparaPath[]; chapters: number[] }) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const [cap, setCap] = useState<number | null>(null)
  const [leaving, setLeaving] = useState<Set<PathSlug>>(new Set())
  const cards = useRef(new Map<PathSlug, HTMLElement>())
  const before = useRef<{ rects: Map<PathSlug, DOMRect>; shown: Set<PathSlug> } | null>(null)

  const visible = paths.filter(p => countFor(p, cap) > 0)
  const total = visible.reduce((s, p) => s + countFor(p, cap), 0)
  const summary = cap == null
    ? { it: `${total} carte in ${paths.length} percorsi`, en: `${total} cards in ${paths.length} paths` }
    : {
        it: `${total} carte del cap. ${cap} in ${visible.length} ${visible.length === 1 ? 'percorso' : 'percorsi'}`,
        en: `${total} cards from ch. ${cap} in ${visible.length} ${visible.length === 1 ? 'path' : 'paths'}`,
      }

  function commit(next: number | null) {
    const rects = new Map<PathSlug, DOMRect>()
    cards.current.forEach((el, slug) => { if (!el.hidden) rects.set(slug, el.getBoundingClientRect()) })
    before.current = { rects, shown: new Set(rects.keys()) }
    setLeaving(new Set())
    setCap(next)
  }

  function choose(next: number | null) {
    if (next === cap) return
    const shown = (p: ImparaPath, c: number | null) => c == null || countFor(p, c) > 0
    const going = paths.filter(p => shown(p, cap) && !shown(p, next)).map(p => p.slug)
    if (going.length && !reducedMotion()) {
      setLeaving(new Set(going))
      setTimeout(() => commit(next), tokenMs('--d-micro', 150))
    } else {
      commit(next)
    }
  }

  // FLIP: after the filter applies, slide each card from where it was.
  useLayoutEffect(() => {
    const prev = before.current
    before.current = null
    if (!prev || reducedMotion()) return
    cards.current.forEach((el, slug) => {
      if (el.hidden) return
      const first = prev.rects.get(slug)
      el.style.transition = 'none'
      if (!first) {
        el.style.opacity = '0'
        void el.offsetHeight
        el.style.transition = 'opacity var(--d-small) var(--e-decel)'
        el.style.opacity = ''
        return
      }
      const dy = first.top - el.getBoundingClientRect().top
      if (!dy) { el.style.transition = ''; return }
      el.style.transform = `translateY(${dy}px)`
      void el.offsetHeight
      el.style.transition = 'transform var(--d-medium) var(--e-standard)'
      el.style.transform = ''
    })
  }, [cap])

  return (
    <>
      <LargeTitle title={t('learn')} sub={<Bi {...summary} />} />

      {chapters.length > 0 && (
        <div className="nm-caps nm-x" role="group" aria-label={plainText(t('chapterFilter'), imm)}>
          <button type="button" aria-pressed={cap == null} onClick={() => choose(null)}><Bi k="all" /></button>
          {chapters.map(ch => (
            <button key={ch} type="button" aria-pressed={cap === ch} onClick={() => choose(ch)}>cap. {ch}</button>
          ))}
        </div>
      )}

      <div className="nm-pcards">
        {PATHS.map(meta => {
          const path = paths.find(p => p.slug === meta.slug)!
          const n = countFor(path, cap)
          return (
            <NavLink
              key={meta.slug}
              ref={el => { if (el) cards.current.set(meta.slug, el); else cards.current.delete(meta.slug) }}
              href={`/learn/${meta.slug}`}
              className={`nm-pcard${leaving.has(meta.slug) ? ' leaving' : ''}`}
              hidden={cap != null && n === 0}
            >
              <span className="duo"><Icon name={meta.icon} size={20} /></span>
              <span className="nm-st">
                <b><Bi {...meta.name} /></b>
                <small className="nm-x"><Bi {...meta.blurb} /></small>
              </span>
              <span className="meta">
                <b className="tab-n">{n}</b>
                {cap == null && path.due > 0 && <span className="due tab-n">{path.due} ↻</span>}
              </span>
            </NavLink>
          )
        })}
      </div>
    </>
  )
}
