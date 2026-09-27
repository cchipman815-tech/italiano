import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Italiano',
    short_name: 'Italiano',
    description: 'Italian language flashcards for Chance and Jennifer',
    start_url: '/home',
    display: 'standalone',
    background_color: '#12100E',
    theme_color: '#12100E',
    // Generated from docs/design/app-icon.svg by scripts/build-icons.ts
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
