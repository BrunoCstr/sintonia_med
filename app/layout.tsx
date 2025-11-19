import type { Metadata, Viewport } from 'next'
import { Geist, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFF3' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1d2e' },
  ],
}

export const metadata: Metadata = {
  title: 'SintoniaMed - Banco de Questões Médicas',
  description: 'O banco de questões do estudante de Medicina. Partiu Sintonizar?',
  generator: 'v0.app',
  manifest: '/manifest.json',
  keywords: ['medicina', 'questões', 'simulado', 'estudo', 'concurso médico', 'revalida', 'residência médica'],
  authors: [{ name: 'SintoniaMed' }],
  icons: {
    icon: [
      { url: '/icon-192.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icon-512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: '/apple-icon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SintoniaMed" />
      </head>
      <body className={`${geist.className} ${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
