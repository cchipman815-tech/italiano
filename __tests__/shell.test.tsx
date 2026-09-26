import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import Shell, { useShell } from '@/components/Shell'
import LargeTitle from '@/components/LargeTitle'
import NavLink from '@/components/NavLink'
import { t } from '@/lib/i18n'

const nav = vi.hoisted(() => ({ pathname: '/home', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push }),
}))

// jsdom lacks these browser APIs.
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  document.documentElement.removeAttribute('data-mode')
  nav.pathname = '/home'
  nav.push.mockClear()
})
afterEach(() => vi.useRealTimers())

const prefs = { theme: 'notte', imm: 'mix', layout: 'mobile' } as const
const user = { id: 1, name: 'Chance' }

function renderShell(children: React.ReactNode = <LargeTitle title={t('today')} />) {
  return render(<Shell user={user} initialPrefs={prefs}>{children}</Shell>)
}

describe('tab bar', () => {
  it('marks the current tab and stays reachable on a tab root', () => {
    renderShell()
    const tabs = screen.getByRole('navigation')
    expect(tabs.className).not.toContain('away')
    expect(tabs.hasAttribute('inert')).toBe(false)
    expect(screen.getByRole('link', { current: 'page' }).getAttribute('href')).toBe('/home')
  })

  it('slides away and goes inert on a study screen', () => {
    nav.pathname = '/sets/abc/quiz'
    const { container } = renderShell(<div />)
    const tabs = document.querySelector('.nm-tabs')!
    expect(tabs.className).toContain('away')
    expect(tabs.hasAttribute('inert')).toBe(true)
    expect(container.querySelector('#shell-content')!.className).not.toContain('shell-has-tabs')
  })

  it('is absent before anyone signs in', () => {
    render(<Shell user={null} initialPrefs={prefs}><div /></Shell>)
    expect(document.querySelector('.nm-tabs')).toBeNull()
  })
})

describe('profile sheet', () => {
  it('opens from the avatar, makes the page inert, and closes with Escape back to the avatar', () => {
    vi.useFakeTimers()
    renderShell()
    const avatar = screen.getByRole('button', { name: 'Profilo · Profile: Chance' })
    avatar.focus()
    fireEvent.click(avatar)

    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('open')
    expect(dialog.hasAttribute('inert')).toBe(false)
    document.querySelectorAll<HTMLElement>('[data-shell-bg]').forEach(el => expect(el.inert).toBe(true))

    act(() => { vi.advanceTimersByTime(400) })
    expect(dialog.contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialog.className).not.toContain('open')
    expect(dialog.hasAttribute('inert')).toBe(true)
    document.querySelectorAll<HTMLElement>('[data-shell-bg]').forEach(el => expect(el.inert).toBe(false))
    expect(document.activeElement).toBe(avatar)
  })

  it('closes when the dim is tapped', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: /Profile: Chance/ }))
    fireEvent.click(document.querySelector('.p-dim')!)
    expect(screen.getByRole('dialog', { hidden: true }).className).not.toContain('open')
  })

  it('switches to Giorno and presses the right segment', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: /Profile: Chance/ }))
    const giorno = screen.getByRole('button', { name: 'Giorno' })
    fireEvent.click(giorno)
    expect(document.documentElement.dataset.mode).toBe('giorno')
    expect(giorno.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Notte' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('staggers rows on the first open only', () => {
    renderShell()
    const avatar = screen.getByRole('button', { name: /Profile: Chance/ })
    fireEvent.click(avatar)
    const row = document.querySelector<HTMLElement>('.p-sheet .sr')!
    expect(row.style.transitionDelay).toBe('calc(var(--stagger) * 2)')
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(avatar)
    expect(row.style.transitionDelay).toBe('0s')
  })
})

function RaiseUndo({ onUndo }: { onUndo: () => void }) {
  const shell = useShell()!
  return (
    <button type="button" onClick={() => shell.showUndo({ message: 'Eliminata: la stazione', onAction: onUndo })}>
      delete
    </button>
  )
}

describe('undo bar', () => {
  it('shows a message with Undo, runs the action, and hides', () => {
    const onUndo = vi.fn()
    renderShell(<RaiseUndo onUndo={onUndo} />)
    fireEvent.click(screen.getByText('delete'))
    const bar = screen.getByRole('status')
    expect(bar.className).toContain(' on')
    expect(bar.textContent).toContain('Eliminata: la stazione')
    fireEvent.click(screen.getByRole('button', { name: /Annulla/ }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(bar.className).not.toContain(' on')
  })

  it('stays until the user navigates away', () => {
    const { rerender } = renderShell(<RaiseUndo onUndo={() => {}} />)
    fireEvent.click(screen.getByText('delete'))
    expect(screen.getByRole('status').className).toContain(' on')
    nav.pathname = '/learn'
    rerender(<Shell user={user} initialPrefs={prefs}><RaiseUndo onUndo={() => {}} /></Shell>)
    expect(screen.getByRole('status').className).not.toContain(' on')
  })
})

describe('NavLink', () => {
  it('navigates through the router (no View Transitions in jsdom)', () => {
    renderShell(<NavLink href="/saved">Salvate</NavLink>)
    fireEvent.click(screen.getByText('Salvate', { selector: 'a[href="/saved"]:not(.nm-tab)' }))
    expect(nav.push).toHaveBeenCalledWith('/saved')
  })

  it('still navigates, without an uncaught error, when the browser aborts the transition', async () => {
    const aborted = () => Promise.reject(new DOMException('Transition was aborted because of invalid state', 'InvalidStateError'))
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    const doc = document as unknown as { startViewTransition?: unknown }
    doc.startViewTransition = (update: () => Promise<void>) => {
      void update()
      return { ready: aborted(), finished: aborted() }
    }
    try {
      renderShell(<NavLink href="/saved">Salvate</NavLink>)
      fireEvent.click(screen.getByText('Salvate', { selector: 'a[href="/saved"]:not(.nm-tab)' }))
      await act(async () => { await new Promise(r => setTimeout(r, 10)) })
      expect(nav.push).toHaveBeenCalledWith('/saved')
      expect(unhandled).not.toHaveBeenCalled()
      expect(document.documentElement.dataset.nav).toBeUndefined()
    } finally {
      delete doc.startViewTransition
      process.off('unhandledRejection', unhandled)
    }
  })

  it('leaves modified clicks to the browser', () => {
    renderShell(<NavLink href="/saved">Salvate</NavLink>)
    fireEvent.click(screen.getByText('Salvate', { selector: 'a[href="/saved"]:not(.nm-tab)' }), { metaKey: true })
    expect(nav.push).not.toHaveBeenCalled()
  })
})
