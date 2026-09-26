/**
 * Display preferences, stored in cookies so the server can stamp them on
 * <html> before first paint (no theme flash).
 *
 *   theme   notte | giorno        → data-mode    (default notte)
 *   imm     en | mix | it         → data-imm     (default mix)
 *   layout  mobile | desktop      → data-layout  (default mobile)
 */

export const PREFS = {
  theme:  { cookie: 'theme',  attr: 'mode',   values: ['notte', 'giorno'],  fallback: 'notte' },
  imm:    { cookie: 'imm',    attr: 'imm',    values: ['en', 'mix', 'it'],  fallback: 'mix' },
  layout: { cookie: 'layout', attr: 'layout', values: ['mobile', 'desktop'], fallback: 'mobile' },
} as const

export type PrefKey = keyof typeof PREFS
export type PrefValue<K extends PrefKey> = (typeof PREFS)[K]['values'][number]
export type Theme = PrefValue<'theme'>
export type Immersion = PrefValue<'imm'>
export type Layout = PrefValue<'layout'>
export type Prefs = { [K in PrefKey]: PrefValue<K> }

/** Browser chrome color per theme; matches --bg. */
export const THEME_COLORS: Record<Theme, string> = {
  notte: '#12100E',
  giorno: '#F6F1E9',
}

const ONE_YEAR = 60 * 60 * 24 * 365

export function isPrefValue<K extends PrefKey>(key: K, value: unknown): value is PrefValue<K> {
  return typeof value === 'string' && (PREFS[key].values as readonly string[]).includes(value)
}

/** Validates a raw cookie value, falling back to the default. */
export function parsePref<K extends PrefKey>(key: K, raw: string | undefined | null): PrefValue<K> {
  return isPrefValue(key, raw) ? raw : PREFS[key].fallback
}

/** Reads every preference through a cookie getter, e.g. `name => cookieStore.get(name)?.value`. */
export function readPrefs(getCookie: (name: string) => string | undefined): Prefs {
  return {
    theme: parsePref('theme', getCookie(PREFS.theme.cookie)),
    imm: parsePref('imm', getCookie(PREFS.imm.cookie)),
    layout: parsePref('layout', getCookie(PREFS.layout.cookie)),
  }
}

/** The data-* attributes <html> carries for a set of preferences. */
export function prefAttributes(prefs: Prefs): Record<`data-${string}`, string> {
  return {
    'data-mode': prefs.theme,
    'data-imm': prefs.imm,
    'data-layout': prefs.layout,
  }
}

/**
 * Client only: saves a preference and applies it to <html> immediately.
 * A theme change snaps: transitions are suppressed until two frames after
 * the new tokens apply, so nothing animates between the two palettes.
 */
export function setPref<K extends PrefKey>(key: K, value: PrefValue<K>): void {
  if (!isPrefValue(key, value)) return
  const { cookie, attr } = PREFS[key]
  document.cookie = `${cookie}=${value}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`

  const root = document.documentElement
  if (key !== 'theme') {
    root.setAttribute(`data-${attr}`, value)
    return
  }

  root.classList.add('no-trans')
  root.setAttribute(`data-${attr}`, value)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[value as Theme])
  void root.offsetHeight // force a reflow so the new tokens apply with transitions off
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-trans')))
}
