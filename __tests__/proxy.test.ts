import { describe, it, expect } from 'vitest'
import { config } from '@/proxy'

// The matcher is one regex group; Next anchors it to the whole pathname.
const runsProxy = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path)

describe('proxy matcher', () => {
  it.each([
    '/favicon.ico',
    '/icon.svg',
    '/apple-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable-192.png',
    '/icon-maskable-512.png',
    '/manifest.webmanifest',
    '/sw.js',
  ])('leaves %s public', path => {
    expect(runsProxy(path)).toBe(false)
  })

  it.each(['/', '/home', '/login', '/learn/verbi', '/sets/abc/edit'])('guards %s', path => {
    expect(runsProxy(path)).toBe(true)
  })
})
