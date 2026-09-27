import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidUserId } from '@/lib/users'
import { isMissingRoute } from '@/lib/nav'

export function proxy(request: NextRequest) {
  const raw = request.cookies.get('userId')?.value
  const userId = raw ? parseInt(raw, 10) : null
  const hasValidUser = userId !== null && isValidUserId(userId)
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (isApiRoute) return NextResponse.next()

  if (!hasValidUser && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasValidUser && isLoginPage) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // No route matches this URL, so Next renders app/not-found.tsx with a 404 status.
  if (isMissingRoute(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL('/_missing', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-192.png|icon-512.png).*)'],
}
