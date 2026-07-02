'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

const REGIONS = [
  { id:'all', label:'All' },
  { id:'Africa', label:'Africa' },
  { id:'Asia', label:'Asia' },
  { id:'Europe', label:'Europe' },
  { id:'Americas', label:'Americas' },
  { id:'Middle East', label:'Middle East' },
  { id:'Oceania', label:'Oceania' },
]

const TABS = ['Everyone', 'Hosts', 'Callers']

export default function HomePage() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [users, setUsers]       = useState([])
  const [region, setRegion]     = useState('all')
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('Everyone')
  const [loading, setLoading]   = useState(true)
  const channelRef = useRef(null)

  useEffect(() => {
    loadData()
    // Re-fetch after 2s to catch any online status updates
    const t = setTimeout(loadData, 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    channelRef.current = supabase
      .channel('presence-web')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setUsers(prev => prev.map(u =>
            u.id === payload.new.id ? { ...u, ...payload.new } : u
          ))
        }
      )
      .subscribe()
    return () => { channelRef.current?.unsubscribe() }
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: all }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').neq('id', user.id).eq('suspended', false),
    ])
    setProfile(prof)
    setUsers(all || [])
    setLoading(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase())
    const matchRegion = region === 'all' || u.city === region
    const matchTab = tab === 'Everyone' ? true : tab === 'Hosts' ? u.is_host : !u.is_host
    return matchSearch && matchRegion && matchTab
  })

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <Mark size={48} glow={true}/>
        <div style={{ color:'var(--sub)', fontSize:13 }}>Loading…</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', maxWidth:480, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100,
        background:'rgba(6,4,14,0.95)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)', padding:'12px 18px' }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Mark size={32} glow={false}/>
            <span style={{ fontFamily:"'Outfit', sans-serif", fontSize:11,
              fontWeight:300, letterSpacing:6, color:'var(--gold)' }}>SPARKCALL</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => router.push('/credits')}
              style={{ background:'rgba(201,164,106,0.1)',
                border:'1px solid rgba(201,164,106,0.3)',
                color:'var(--gold)', borderRadius:99, padding:'6px 14px',
                cursor:'pointer', fontSize:13, fontWeight:700 }}>
              ⚡ {profile?.credits || 0}
            </button>
            <button onClick={() => router.push('/premium')}
              style={{ background:'rgba(184,204,228,0.1)',
                border:'1px solid rgba(184,204,228,0.3)',
                color:'#B8CCE4', borderRadius:99, padding:'6px 12px',
                cursor:'pointer', fontSize:12, fontWeight:600 }}>
              {profile?.premium ? (profile.premium === 'platinum' ? '💎' : '⭐') : '✦ Premium'}
            </button>
            <button onClick={handleSignOut}
              style={{ background:'var(--card)', border:'1px solid var(--border)',
                color:'var(--sub)', borderRadius:99, padding:'6px 12px',
                cursor:'pointer', fontSize:12 }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search people…"
          style={{ width:'100%', padding:'9px 14px', marginBottom:10,
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:12, color:'var(--text)', fontSize:13, boxSizing:'border-box' }}/>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'7px', borderRadius:99, cursor:'pointer', fontSize:12,
              fontWeight:500, border:`1px solid ${tab===t ? 'var(--rose)' : 'var(--border)'}`,
              background: tab===t ? 'rgba(214,63,110,0.12)' : 'transparent',
              color: tab===t ? 'var(--rose)' : 'var(--sub)',
            }}>{t}</button>
          ))}
        </div>

        {/* Region filters */}
        <div style={{ display:'flex', gap:7, overflowX:'auto',
          scrollbarWidth:'none', paddingBottom:2 }}>
          {REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)} style={{
              padding:'5px 12px', borderRadius:99, whiteSpace:'nowrap', cursor:'pointer',
              fontSize:11, fontWeight:500,
              border:`1px solid ${region===r.id ? 'var(--gold)' : 'var(--border)'}`,
              background: region===r.id ? 'rgba(201,164,106,0.1)' : 'transparent',
              color: region===r.id ? 'var(--gold)' : 'var(--sub)',
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding:'20px 18px 12px', textAlign:'center',
        background:'radial-gradient(ellipse at 50% 0%, rgba(214,63,110,0.12), transparent 65%)' }}>
        <div style={{ fontSize:10, letterSpacing:4, color:'var(--gold)',
          fontWeight:600, marginBottom:8, textTransform:'uppercase' }}>
          Premium · Verified · Exclusive
        </div>
        <h1 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:26,
          fontWeight:700, lineHeight:1.2, marginBottom:4 }}>
          Hello {profile?.name?.split(' ')[0]}, meet someone{' '}
          <em style={{ color:'var(--gold)' }}>extraordinary</em>
        </h1>
        <p style={{ color:'var(--sub)', fontSize:13 }}>
          {filtered.length} {tab === 'Everyone' ? 'people' : tab.toLowerCase()} available
        </p>
      </div>

      {/* User grid */}
      <div style={{ padding:'8px 16px 100px', display:'flex', flexDirection:'column', gap:14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--sub)', padding:48 }}>
            No {tab === 'Everyone' ? 'users' : tab.toLowerCase()} found
          </div>
        ) : filtered.map((u, i) => (
          <div key={u.id}
            onClick={() => router.push(`/profile/${u.id}`)}
            style={{ background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:20, padding:20, cursor:'pointer',
              transition:'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,164,106,0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              {/* Avatar */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:56, height:56, borderRadius:'50%',
                  background: u.is_host
                    ? 'linear-gradient(145deg,rgba(201,164,106,0.6),rgba(201,164,106,0.2))'
                    : 'linear-gradient(145deg,var(--rose),rgba(214,63,110,0.4))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, fontWeight:700, color:'#fff',
                  fontFamily:"'Cormorant Garamond', serif" }}>
                  {u.name?.charAt(0)}
                </div>
                {u.online && (
                  <div style={{ position:'absolute', bottom:2, right:2,
                    width:10, height:10, borderRadius:'50%', background:'#3DD68C',
                    border:'2px solid var(--card)' }}/>
                )}
              </div>

              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <span style={{ fontFamily:"'Cormorant Garamond', serif",
                    fontSize:18, fontWeight:700 }}>{u.name}</span>
                  {/* Host/Caller badge */}
                  <span style={{
                    fontSize:9, fontWeight:700, letterSpacing:1, padding:'2px 7px',
                    borderRadius:99,
                    background: u.is_host ? 'rgba(201,164,106,0.15)' : 'rgba(214,63,110,0.12)',
                    border: `1px solid ${u.is_host ? 'rgba(201,164,106,0.4)' : 'rgba(214,63,110,0.3)'}`,
                    color: u.is_host ? 'var(--gold)' : 'var(--rose)',
                  }}>{u.is_host ? 'HOST' : 'CALLER'}</span>
                </div>
                <div style={{ color:'var(--sub)', fontSize:12 }}>{u.city}</div>
                {u.is_host && (
                  <div style={{ color:'var(--gold)', fontSize:12, marginTop:2 }}>
                    {'★'.repeat(Math.floor(u.rating || 0))} {u.rating || 'New'}
                  </div>
                )}
              </div>

              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:"'Cormorant Garamond', serif",
                  color:'var(--gold)', fontWeight:700, fontSize:20 }}>
                  {u.rate} ⚡
                </div>
                <div style={{ color:'var(--sub)', fontSize:10 }}>/min</div>
                <div style={{ marginTop:6, fontSize:10, fontWeight:500,
                  color: u.online ? '#3DD68C' : 'var(--sub)',
                  padding:'2px 7px', borderRadius:99,
                  background: u.online ? 'rgba(61,214,140,0.1)' : 'transparent' }}>
                  {u.online ? '● Live' : '○ Away'}
                </div>
              </div>
            </div>

            {u.bio && (
              <p style={{ color:'var(--sub)', fontSize:13, lineHeight:1.55,
                marginTop:10, marginBottom:0 }}>{u.bio}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
