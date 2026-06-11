'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

const REGIONS = [
  { id:'all', label:'All', emoji:'🌐' },
  { id:'usa', label:'USA', emoji:'🇺🇸' },
  { id:'europe', label:'Europe', emoji:'🌍' },
  { id:'asia', label:'Asia', emoji:'🌏' },
  { id:'africa', label:'Africa', emoji:'🌍' },
  { id:'latam', label:'Americas', emoji:'🌎' },
]

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [hosts, setHosts] = useState([])
  const [region, setRegion] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)

    // Load hosts (opposite gender)
    const oppositeGender = profile?.gender === 'M' ? 'F' : 'M'
    const { data: hosts } = await supabase
      .from('profiles')
      .select('*')
      .eq('gender', oppositeGender)
      .eq('is_host', true)
      .eq('suspended', false)
    setHosts(hosts || [])
    setLoading(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = hosts.filter(h => {
    if (search && !h.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Mark size={48} glow={true} />
        <div style={{ color: 'var(--sub)', fontSize: 13 }}>Loading…</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mark size={32} glow={false} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11,
              fontWeight: 300, letterSpacing: 6, color: 'var(--gold)' }}>SPARKCALL</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => router.push('/credits')}
              style={{ background: 'rgba(201,164,106,0.1)',
                border: '1px solid rgba(201,164,106,0.3)',
                color: 'var(--gold)', borderRadius: 99, padding: '6px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              ⚡ {profile?.credits || 0}
            </button>
            <button onClick={() => router.push('/premium')}
  style={{ background: 'rgba(184,204,228,0.1)',
    border: '1px solid rgba(184,204,228,0.3)',
    color: '#B8CCE4', borderRadius: 99, padding: '6px 12px',
    cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
  {profile?.premium ? (profile.premium === 'platinum' ? '👑' : '⭐') : '✦ Premium'}
</button>
            <button onClick={handleSignOut}
              style={{ background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--sub)', borderRadius: 99, padding: '6px 12px',
                cursor: 'pointer', fontSize: 12 }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--sub)' }}>◎</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            style={{ width: '100%', padding: '9px 14px 9px 36px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--text)', fontSize: 13 }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        {/* Region filters */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto',
          scrollbarWidth: 'none', paddingBottom: 2 }}>
          {REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)}
              style={{ padding: '5px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                border: `1px solid ${region === r.id ? 'var(--gold)' : 'var(--border)'}`,
                background: region === r.id ? 'rgba(201,164,106,0.1)' : 'transparent',
                color: region === r.id ? 'var(--gold)' : 'var(--sub)',
                cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '20px 18px 12px', textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(214,63,110,0.12), transparent 65%)' }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--gold)',
          fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
          Premium · Verified · Exclusive
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26,
          fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
          Hello {profile?.name?.split(' ')[0]}, meet someone{' '}
          <em style={{ color: 'var(--gold)' }}>extraordinary</em>
        </h1>
        <p style={{ color: 'var(--sub)', fontSize: 13 }}>
          {filtered.length} hosts available
        </p>
      </div>

      {/* Host grid */}
      <div style={{ padding: '8px 16px 100px', display: 'flex',
        flexDirection: 'column', gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--sub)', padding: 48 }}>
            {hosts.length === 0
              ? 'No hosts yet — be the first to join!'
              : 'No hosts found'}
          </div>
        ) : (
          filtered.map((host, i) => (
            <div key={host.id}
              onClick={() => router.push(`/profile/${host.id}`)}
              style={{ background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 20, padding: 20, cursor: 'pointer',
                animation: `fadeUp 0.4s ${i * 60}ms ease both`,
                transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,164,106,0.12)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                {/* Avatar */}
                <div style={{ width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
                  fontFamily: "'Cormorant Garamond', serif" }}>
                  {host.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 18, fontWeight: 700 }}>{host.name}</div>
                  <div style={{ color: 'var(--sub)', fontSize: 12, marginTop: 2 }}>
                    {host.age} · {host.city}
                  </div>
                  <div style={{ color: 'var(--gold)', fontSize: 12, marginTop: 2 }}>
                    {'★'.repeat(Math.floor(host.rating || 0))} {host.rating || 'New'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif",
                    color: 'var(--gold)', fontWeight: 700, fontSize: 20 }}>
                    {host.rate} ⚡
                  </div>
                  <div style={{ color: 'var(--sub)', fontSize: 10 }}>/min</div>
                  <div style={{ marginTop: 6, fontSize: 10, fontWeight: 500,
                    color: host.online ? 'var(--green)' : 'var(--sub)',
                    background: host.online ? 'var(--greenSoft)' : 'transparent',
                    padding: '2px 7px', borderRadius: 99 }}>
                    {host.online ? '● Live' : '○ Away'}
                  </div>
                </div>
              </div>
              {host.bio && (
                <p style={{ color: 'var(--sub)', fontSize: 13,
                  lineHeight: 1.55, marginBottom: 10 }}>{host.bio}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}