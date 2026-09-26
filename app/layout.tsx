import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { THEME_COLORS, prefAttributes, readPrefs } from '@/lib/prefs'

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
})
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Italiano — Study Italian',
  description: 'Italian language flashcards and quizzes for Chance and Jennifer',
}

async function getPrefs() {
  const cookieStore = await cookies()
  return readPrefs(name => cookieStore.get(name)?.value)
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
  const prefs = await getPrefs()
  return (
    <html
      lang="en"
      {...prefAttributes(prefs)}
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
