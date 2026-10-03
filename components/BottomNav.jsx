'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Compass, Zap, Star, Clock, MessageCircle } from 'lucide-react'

const TABS = [
  { href: '/home', icon: Compass, label: 'Discover' },
  { href: '/credits', icon: Zap, label: 'Sparks' },
  { href: '/premium', icon: Star, label: 'Premium' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
]

  export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const hiddenOn = ['/', '/login', '/signup']
  if (hiddenOn.includes(pathname) || pathname.startsWith('/call/') || pathname.startsWith('/chat/')) return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 8px', maxWidth: 1200, margin: '0 auto' }}>
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = pathname === tab.href
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: active ? 'var(--rose)' : 'var(--sub)', flex: 1 }}>
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}