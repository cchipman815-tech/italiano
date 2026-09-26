import { describe, it, expect, beforeEach } from 'vitest'
import { PREFS, THEME_COLORS, isPrefValue, parsePref, prefAttributes, readPrefs, setPref } from '@/lib/prefs'

describe('parsePref', () => {
  it('accepts every allowed value', () => {
    for (const key of Object.keys(PREFS) as (keyof typeof PREFS)[]) {
      for (const value of PREFS[key].values) expect(parsePref(key, value)).toBe(value)
    }
  })

  it('falls back to Notte, Mix and mobile', () => {
    expect(parsePref('theme', undefined)).toBe('notte')
    expect(parsePref('imm', null)).toBe('mix')
    expect(parsePref('layout', '')).toBe('mobile')
  })

  it('rejects values from another preference, other casing, or injected text', () => {
    expect(parsePref('theme', 'desktop')).toBe('notte')
    expect(parsePref('theme', 'Giorno')).toBe('notte')
    expect(parsePref('imm', 'it"><script>')).toBe('mix')
    expect(isPrefValue('layout', 'desktop')).toBe(true)
    expect(isPrefValue('layout', 42)).toBe(false)
  })
})

describe('readPrefs', () => {
  it('reads each preference from its own cookie', () => {
    const jar: Record<string, string> = { theme: 'giorno', imm: 'it', layout: 'desktop' }
    expect(readPrefs(name => jar[name])).toEqual({ theme: 'giorno', imm: 'it', layout: 'desktop' })
  })

  it('defaults anything missing or invalid', () => {
    const jar: Record<string, string> = { theme: 'sepia' }
    expect(readPrefs(name => jar[name])).toEqual({ theme: 'notte', imm: 'mix', layout: 'mobile' })
  })
})

describe('prefAttributes', () => {
  it('maps preferences to the data attributes on <html>', () => {
    expect(prefAttributes({ theme: 'giorno', imm: 'en', layout: 'mobile' })).toEqual({
      'data-mode': 'giorno',
      'data-imm': 'en',
      'data-layout': 'mobile',
    })
  })
})

describe('setPref', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-mode')
    document.documentElement.removeAttribute('data-imm')
    document.documentElement.className = ''
    document.head.innerHTML = '<meta name="theme-color" content="#12100E">'
    document.cookie = 'theme=; max-age=0; path=/'
    document.cookie = 'imm=; max-age=0; path=/'
  })

  it('stores the cookie and stamps <html>', () => {
    setPref('imm', 'en')
    expect(document.cookie).toContain('imm=en')
    expect(document.documentElement.dataset.imm).toBe('en')
  })

  it('snaps a theme change: transitions off, then back on', async () => {
    setPref('theme', 'giorno')
    expect(document.documentElement.dataset.mode).toBe('giorno')
    expect(document.documentElement.classList.contains('no-trans')).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe(THEME_COLORS.giorno)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r))))
    expect(document.documentElement.classList.contains('no-trans')).toBe(false)
  })

  it('ignores a value that isn’t allowed', () => {
    setPref('theme', 'sepia' as 'notte')
    expect(document.documentElement.dataset.mode).toBeUndefined()
    expect(document.cookie).not.toContain('theme=sepia')
  })
})
