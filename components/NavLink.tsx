'use client'
import Link from 'next/link'
import type { ComponentProps, MouseEvent } from 'react'
import type { NavDirection } from '@/lib/nav'
import { useShell } from './Shell'

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string
  /** Which screen transition to play: push (default), back or tab. */
  nav?: NavDirection
}

/** A Link that plays the shell's push/back/tab transition. Modified clicks behave like a normal link. */
export default function NavLink({ href, nav = 'push', onClick, ...rest }: Props) {
  const shell = useShell()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (!shell || e.defaultPrevented || e.button !== 0) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target) return
    e.preventDefault()
    shell.navigate(href, nav)
  }

  return <Link href={href} onClick={handleClick} {...rest} />
}
