import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Komyx', short_name: 'Komyx',
    description: 'Gestão financeira para corretores de consórcio.',
    start_url: '/app', display: 'standalone',
    background_color: '#F8FAFC', theme_color: '#FFFFFF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
