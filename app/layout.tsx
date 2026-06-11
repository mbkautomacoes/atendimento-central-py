import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWASetup from './components/PWASetup'

export const metadata: Metadata = {
  title: 'Central PY - Atendimento',
  description: 'Sistema de atendimento de leads',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CentralPY',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#202c33',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <PWASetup />
        {children}
      </body>
    </html>
  )
}
