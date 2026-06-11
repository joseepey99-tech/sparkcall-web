'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

export default function ProfilePage() {
  const router = useRouter()
  const { id } = useParams()
  const [host, setHost] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUser(user)
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
    const { data: host } = await supabase
      .from('profiles').select('*').eq('id', id).single()
    setHost(host)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)' }}>
      <Mark size={48} glow={true} />
    </div>
  )

  if (!host) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', color: 'var(--sub)' }}>
      Host not found.
    </div>
  )

  const discount = profile?.premium === 'platinum' ? 0.8
    : profile?.premium === 'gold' ? 0.9 : 1
  const effectiveRate = Math.round(host.rate * discount)
  const hasDiscount = discount < 1
  const canAfford = (profile?.credits || 0) >= effectiveRate

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      maxWidth: 480, margin: '0 auto', animation: 'fadeUp 0.3s ease' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()}
          style={{ background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 99, width: 36, height: 36,
            cursor: 'pointer', fontSize: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}>←</button>
        <span style={{ fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20, fontWeight: 700 }}>{host.name}</span>
      </div>

      {/* Hero */}
      <div style={{ padding: '32px 24px',
        background: `radial-gradient(ellipse at 30% 50%, rgba(214,63,110,0.15), transparent 65%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%',
          background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, fontWeight: 700, color: '#fff',
          fontFamily: "'Cormorant Garamond', serif",
          boxShadow: '0 4px 24px rgba(214,63,110,0.3)' }}>
          {host.name?.charAt(0)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{host.name}</h2>
          <div style={{ color: 'var(--sub)', fontSize: 13, marginBottom: 6 }}>
            {host.city}
          </div>
          <div style={{ color: 'var(--gold)', fontSize: 13 }}>
            {'★'.repeat(Math.floor(host.rating || 0))}{' '}
            <span style={{ color: 'var(--sub)' }}>
              {host.rating || 'New'} · {host.total_calls || 0} calls
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600,
            color: host.online ? 'var(--green)' : 'var(--sub)' }}>
            {host.online ? '● Online now' : '○ Offline'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 120px' }}>

        {/* Bio */}
        {host.bio && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 18, marginBottom: 14 }}>
            <div style={{ color: 'var(--sub)', fontSize: 10, fontWeight: 600,
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>About</div>
            <p style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: 14 }}>{host.bio}</p>
          </div>
        )}

        {/* Rate card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(201,164,106,0.1), var(--card))',
          border: '1px solid rgba(201,164,106,0.3)',
          borderRadius: 18, padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'var(--sub)', fontSize: 10, fontWeight: 600,
                letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Rate per minute</div>
              {hasDiscount ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 32, color: 'var(--gold)', fontWeight: 700 }}>
                    {effectiveRate} ⚡
                  </span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 18, color: 'var(--sub)', textDecoration: 'line-through' }}>
                    {host.rate} ⚡
                  </span>
                </div>
              ) : (
                <span style={{ fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 32, color: 'var(--gold)', fontWeight: 700 }}>
                  {host.rate} ⚡<span style={{ fontSize: 15, color: 'var(--sub)',
                    fontWeight: 400 }}> /min</span>
                </span>
              )}
              {hasDiscount && (
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                  {profile.premium === 'platinum' ? '👑 20%' : '⭐ 10%'} premium discount
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--sub)', fontSize: 11 }}>Your balance</div>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 20,
                fontFamily: "'Cormorant Garamond', serif" }}>⚡ {profile?.credits || 0}</div>
              <div style={{ color: 'var(--sub)', fontSize: 11 }}>
                ≈ {Math.floor((profile?.credits || 0) / effectiveRate)} min
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button onClick={() => router.push(`/chat/${host.id}`)}
            style={{ flex: 1, padding: '14px', borderRadius: 14,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            💬 Chat First
          </button>
          <button
            onClick={() => canAfford && host.online && router.push(`/call/${host.id}`)}
            disabled={!host.online || !canAfford}
            style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none',
              background: host.online && canAfford
                ? 'linear-gradient(135deg, var(--rose), #A02050)'
                : 'var(--border)',
              color: host.online && canAfford ? '#fff' : 'var(--sub)',
              fontSize: 14, fontWeight: 700,
              cursor: host.online && canAfford ? 'pointer' : 'not-allowed',
              boxShadow: host.online && canAfford
                ? '0 8px 30px rgba(214,63,110,0.3)' : 'none' }}>
            {!host.online ? '🔴 Offline'
              : !canAfford ? '⚡ Not enough Sparks'
              : '📞 Start Call'}
          </button>
        </div>

        {!canAfford && (
          <div onClick={() => router.push('/credits')}
            style={{ textAlign: 'center', color: 'var(--gold)', fontSize: 13,
              cursor: 'pointer', padding: 8 }}>
            ⚡ Top up Sparks to call →
          </div>
        )}
      </div>
    </div>
  )
}