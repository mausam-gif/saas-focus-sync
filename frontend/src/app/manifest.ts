import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FocusSync Employee Management',
    short_name: 'FocusSync',
    description: 'Modern Employee Monitoring SaaS',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F8FA',
    theme_color: '#F7F8FA',
    icons: [
      {
        src: '/globe.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/window.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      }
    ],
  }
}
