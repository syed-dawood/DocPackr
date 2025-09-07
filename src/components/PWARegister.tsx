'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Avoid caching headaches during local development
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const r of regs) r.unregister()
        })
        return
      }
      const register = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js')
        } catch {
          // ignore
        }
      }
      register()
    }
  }, [])
  return null
}
