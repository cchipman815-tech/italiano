import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Italiano',
    short_name: 'Italiano',
    description: 'Italian language flashcards for Chance and Jennifer',
    start_url: '/home',
    display: 'standalone',
    background_color: '#f6f7fb',
    theme_color: '#4255ff',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
