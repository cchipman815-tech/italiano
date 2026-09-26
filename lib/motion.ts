/** Motion helpers for components that animate from script. Browser-only. */

/**
 * A CSS time in ms: "400ms" → 400, ".4s" → 400. The CSS build minifies
 * `250ms` to `.25s`, so the unit matters.
 */
export function parseCssTime(value: string): number | null {
  const m = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(value)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!Number.isFinite(n)) return null
  return m[2] === 's' ? n * 1000 : n
}

/** A motion token from :root in ms (e.g. --d-medium → 400, or 150 under reduced motion). */
export function tokenMs(name: string, fallback: number): number {
  return parseCssTime(getComputedStyle(document.documentElement).getPropertyValue(name)) ?? fallback
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Forces style recalculation, so a transition starts from the styles just set. */
export function reflow(el: HTMLElement): void {
  void el.offsetWidth
}
