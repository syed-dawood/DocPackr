import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })
const geistMono = GeistMono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'DocPackr',
  description: 'Private, offline-first document packer',
  manifest: '/manifest.webmanifest',
  themeColor: '#0b1020',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${geistMono.variable}`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
