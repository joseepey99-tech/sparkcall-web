'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

const PACKS = [
  { id: 'starter',   label: 'Starter',    sparks: 200,  price: 2.99, popular: false },
  { id: 'popular',   label: 'Popular',    sparks: 600,  price: 7.99, popular: true  },
  { id: 'bestvalue', label: 'Best Value', sparks: 2000, price: 19.99, popular: false },
]

export default function CreditsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setLoading(false)
  }

  const handleBuy = async (pack) => {
    setBuying(pack.id)
    try {
      const res = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      alert('Payment error. Please try again.')
    }
    setBuying(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)' }}>
      <Mark size={48} glow={true} />
    </div>
  )

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
          fontSize: 20, fontWeight: 700 }}>Buy Sparks</span>
      </div>

      <div style={{ padding: '32px 20px 80px' }}>

        {/* Balance */}
        <div style={{ textAlign: 'center', marginBottom: 32,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(201,164,106,0.12), transparent 60%)',
          padding: '28px 0 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28, marginBottom: 6 }}>⚡ Your Balance</div>
          <div style={{ color: 'var(--gold)', fontSize: 48,
            fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>
            {profile?.credits || 0}
          </div>
          <div style={{ color: 'var(--sub)', fontSize: 13, marginTop: 4 }}>
            Sparks available
          </div>
        </div>

        {/* Packs */}
        {PACKS.map(pack => (
          <div key={pack.id}
            style={{ background: pack.popular
              ? 'linear-gradient(135deg, rgba(214,63,110,0.12), var(--card))' : 'var(--card)',
              border: `1px solid ${pack.popular ? 'rgba(214,63,110,0.4)' : 'var(--border)'}`,
              borderRadius: 20, padding: '22px', marginBottom: 14,
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            {pack.popular && (
              <div style={{ position: 'absolute', top: -1, left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, var(--rose), #A02050)',
                color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '4px 14px', borderRadius: '0 0 12px 12px', letterSpacing: 1.5 }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ marginTop: pack.popular ? 10 : 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22, fontWeight: 700 }}>
                <span style={{ color: 'var(--gold)' }}>⚡ {pack.sparks}</span> Sparks
              </div>
              <div style={{ color: 'var(--sub)', fontSize: 12, marginTop: 2 }}>
                {pack.label} · ${(pack.price / pack.sparks).toFixed(4)}/spark
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22, fontWeight: 700 }}>${pack.price}</div>
              <button onClick={() => handleBuy(pack)}
                disabled={buying === pack.id}
                style={{ marginTop: 8, padding: '8px 20px', borderRadius: 99,
                  background: buying === pack.id ? 'var(--border)'
                    : pack.popular
                    ? 'linear-gradient(135deg, var(--rose), #A02050)'
                    : 'var(--surface)',
                  border: `1px solid ${pack.popular ? 'var(--rose)' : 'var(--border)'}`,
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: buying === pack.id ? 'not-allowed' : 'pointer' }}>
                {buying === pack.id ? '…' : 'Buy'}
              </button>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 20, padding: 16, background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 14,
          color: 'var(--sub)', fontSize: 12, lineHeight: 1.7, textAlign: 'center' }}>
          🔒 Payments secured by Stripe<br />
          Unused Sparks never expire · Hosts earn 70%
        </div>
      </div>
    </div>
  )
}