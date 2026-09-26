import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import Script from 'next/script'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import Shell from '@/components/Shell'
import { getUserById, isValidUserId } from '@/lib/users'
import { THEME_COLORS, prefAttributes, readPrefs } from '@/lib/prefs'

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
})
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

const SKIPPED_TRANSITIONS =
  "['pageswap','pagereveal'].forEach(function(t){addEventListener(t,function(e){var v=e.viewTransition;if(v){v.ready.catch(function(){});v.finished.catch(function(){})}})})"

export const metadata: Metadata = {
  title: 'Italiano — Study Italian',
  description: 'Italian language flashcards and quizzes for Chance and Jennifer',
}

async function getPrefs() {
  const cookieStore = await cookies()
  return readPrefs(name => cookieStore.get(name)?.value)
}

async function getUser() {
  const cookieStore = await cookies()
  const id = Number(cookieStore.get('userId')?.value)
  return isValidUserId(id) ? getUserById(id) : null
}

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getPrefs()
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: THEME_COLORS[theme],
    colorScheme: theme === 'notte' ? 'dark' : 'light',
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [prefs, user] = await Promise.all([getPrefs(), getUser()])
  return (
    <html
      lang="en"
      {...prefAttributes(prefs)}
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        {/* A cross-document view transition (Chi studia? ↔ Oggi) that the browser skips
            rejects its promise; that's expected, not an error. Runs before the first render. */}
        <Script id="skipped-transitions" strategy="beforeInteractive">{SKIPPED_TRANSITIONS}</Script>
        <ServiceWorkerRegistration />
        <Shell user={user ? { id: user.id, name: user.name } : null} initialPrefs={prefs}>
          {children}
        </Shell>
      </body>
    </html>
  )
}
