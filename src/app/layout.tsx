import './globals.css'

import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })
// GeistMono from the `geist` package is a pre-configured font instance

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'DocPackr',
  description: 'Private, offline-first document packer',
  manifest: '/manifest.webmanifest',
  themeColor: '#0b1020',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} ${GeistMono.variable}`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
