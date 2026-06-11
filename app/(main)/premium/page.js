'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

const PLANS = [
  {
    id: 'gold',
    name: 'Gold',
    icon: '⭐',
    price: 9.99,
    color: '#C9A46A',
    bonus: 200,
    discount: 10,
    features: [
      '200 bonus Sparks every month',
      'Advanced filters',
      '10% discount on all calls',
      'Priority in search results',
      'Gold badge on your profile',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    icon: '👑',
    price: 19.99,
    color: '#B8CCE4',
    bonus: 500,
    discount: 20,
    popular: true,
    features: [
      '500 bonus Sparks every month',
      'Access Platinum-exclusive hosts',
      '2× gift value',
      '20% discount on all calls',
      'Profile boost — appear at top',
      'See who viewed your profile',
      'Platinum crown on your profile',
      'VIP priority support 24/7',
    ],
  },
]

export default function PremiumPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [selected, setSelected] = useState('platinum')
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProfile()
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) setSuccess(true)
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setLoading(false)
  }

  const handleSubscribe = async () => {
    setBuying(true)
    try {
      const res = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      alert('Payment error. Please try again.')
    }
    setBuying(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Mark size={48} glow={true} />
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.6s ease' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>
          {profile?.premium === 'platinum' ? '👑' : '⭐'}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif",
          fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Welcome to {profile?.premium === 'platinum' ? 'Platinum' : 'Gold'}!
        </div>
        <div style={{ color: 'var(--sub)', marginBottom: 24 }}>
          Your bonus Sparks have been added.
        </div>
        <button onClick={() => router.push('/home')}
          style={{ padding: '14px 32px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, var(--gold), #A07840)',
            color: '#0C0817', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Go to Home →
        </button>
      </div>
    </div>
  )

  const plan = PLANS.find(p => p.id === selected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      maxWidth: 480, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

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
          fontSize: 20, fontWeight: 700 }}>Upgrade</span>
        {profile?.premium && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1,
            padding: '2px 8px', borderRadius: 99,
            background: profile.premium === 'platinum'
              ? 'rgba(184,204,228,0.1)' : 'rgba(201,164,106,0.1)',
            border: `1px solid ${profile.premium === 'platinum'
              ? 'rgba(184,204,228,0.3)' : 'rgba(201,164,106,0.3)'}`,
            color: profile.premium === 'platinum' ? '#B8CCE4' : 'var(--gold)',
            textTransform: 'uppercase' }}>
            {profile.premium === 'platinum' ? '👑 Platinum' : '⭐ Gold'}
          </span>
        )}
      </div>

      <div style={{ padding: '24px 20px 100px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(201,164,106,0.1), transparent 60%)',
          padding: '20px 0 0' }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--gold)',
            fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            Unlock Premium
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32, fontWeight: 700, lineHeight: 1.15, marginBottom: 10 }}>
            Elevate your<br />
            <em style={{ color: 'var(--gold)' }}>SparkCall experience</em>
          </h1>
          <p style={{ color: 'var(--sub)', fontSize: 14, lineHeight: 1.7,
            maxWidth: 300, margin: '0 auto' }}>
            Bonus Sparks, exclusive hosts, bigger gifts and features that put you first.
          </p>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)',
          borderRadius: 16, padding: 4, marginBottom: 20,
          border: '1px solid var(--border)' }}>
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              style={{ flex: 1, padding: '10px', borderRadius: 13, border: 'none',
                background: selected === p.id
                  ? `linear-gradient(135deg, ${p.color}22, var(--card))` : 'transparent',
                color: selected === p.id ? p.color : 'var(--sub)',
                cursor: 'pointer', fontWeight: 700, fontSize: 13,
                transition: 'all 0.25s',
                boxShadow: selected === p.id ? `0 0 0 1px ${p.color}40` : 'none' }}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        {/* Active plan card */}
        <div style={{ background: `linear-gradient(145deg, ${plan.color}15, var(--card))`,
          border: `1px solid ${plan.color}40`,
          borderRadius: 24, padding: '24px 22px', marginBottom: 18,
          position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30,
            width: 120, height: 120,
            background: `radial-gradient(circle, ${plan.color}25, transparent 70%)`,
            pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 32, marginBottom: 4 }}>{plan.icon}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26, fontWeight: 700, color: plan.color }}>
                {plan.name}
              </div>
              <div style={{ color: 'var(--sub)', fontSize: 12, marginTop: 2 }}>
                per month · cancel anytime
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif",
                fontSize: 38, fontWeight: 700, color: plan.color }}>
                ${plan.price}
              </div>
              <div style={{ color: 'var(--sub)', fontSize: 11 }}>/month</div>
              {profile?.premium === plan.id && (
                <div style={{ marginTop: 6, fontSize: 10,
                  background: 'rgba(61,214,140,0.1)',
                  color: 'var(--green)', padding: '3px 10px',
                  borderRadius: 99, border: '1px solid rgba(61,214,140,0.3)' }}>
                  ✓ Active
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {plan.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%',
                  background: `${plan.color}20`,
                  border: `1px solid ${plan.color}35`,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>✓</div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {profile?.premium === selected ? (
          <div style={{ textAlign: 'center', padding: '14px',
            background: 'rgba(61,214,140,0.1)',
            border: '1px solid rgba(61,214,140,0.3)',
            borderRadius: 14, color: 'var(--green)', fontWeight: 600 }}>
            ✓ You are already on this plan
          </div>
        ) : (
          <button onClick={handleSubscribe} disabled={buying}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: buying ? 'var(--border)'
                : selected === 'platinum'
                ? 'linear-gradient(135deg, #B8CCE4, #8AA8C8)'
                : 'linear-gradient(135deg, var(--gold), #A07840)',
              color: buying ? 'var(--sub)' : '#0C0817',
              fontSize: 14, fontWeight: 600,
              cursor: buying ? 'not-allowed' : 'pointer',
              boxShadow: buying ? 'none' : `0 6px 28px ${plan.color}40` }}>
            {buying ? 'Redirecting…'
              : selected === 'platinum'
              ? '👑 Upgrade to Platinum — $19.99/mo'
              : '⭐ Upgrade to Gold — $9.99/mo'}
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: 12,
          color: 'var(--sub)', fontSize: 11 }}>
          🔒 Secure payment via Stripe · Cancel anytime
        </div>
      </div>
    </div>
  )
}