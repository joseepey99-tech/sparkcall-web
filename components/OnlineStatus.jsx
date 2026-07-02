'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function OnlineStatus() {
  useEffect(() => {
    let token = null

    const setOnline = async (online) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      token = session.access_token
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online, token }),
      })
    }

    setOnline(true)

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && token) {
        navigator.sendBeacon('/api/presence', new Blob([JSON.stringify({ online: false, token })], { type: 'application/json' }))
      } else if (document.visibilityState === 'visible') {
        setOnline(true)
      }
    }

    const handleUnload = () => {
      if (token) navigator.sendBeacon('/api/presence', new Blob([JSON.stringify({ online: false, token })], { type: 'application/json' }))
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [])

  return null
}
