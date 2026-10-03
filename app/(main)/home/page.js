'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'
import { isOnline } from '@/lib/isOnline'
import { countryToFlag, COUNTRIES, countryToContinent } from '@/lib/countries'

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
    const matchRegion = region === 'all' || countryToContinent(u.country) === region
    const matchTab = tab === 'Everyone' ? true : tab === 'Hosts' ? u.is_host : !u.is_host
    return matchSearch && matchRegion && matchTab
  }).sort((a, b) => {
    const aOnline = isOnline(a.last_seen)
    const bOnline = isOnline(b.last_seen)
    if (aOnline !== bOnline) return aOnline ? -1 : 1
    return (b.rating || 0) - (a.rating || 0)
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
        <div style={{ minHeight:'100vh', background:'var(--bg)', maxWidth:1200, margin:'0 auto', overflowX:'hidden' }}>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100,
        background:'rgba(6,4,14,0.95)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)', padding:'12px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', marginBottom:10 }}>
          <Mark size={32} glow={false}/>
          <span style={{ fontFamily:"'Outfit', sans-serif", fontSize:11, marginLeft:10,
            fontWeight:300, letterSpacing:6, color:'var(--gold)' }}>SPARKCALL</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:10, justifyContent:'flex-end' }}>
            <button onClick={() => router.push('/credits')}
              style={{ background:'rgba(201,164,106,0.1)',
                border:'1px solid rgba(201,164,106,0.3)',
                color:'var(--gold)', borderRadius:99, padding:'6px 14px',
                cursor:'pointer', fontSize:13, fontWeight:700 }}>
              ⚡ {profile?.credits || 0}
                 </button>
            <button onClick={() => router.push('/settings')}
              style={{ width:34, height:34, borderRadius:17, padding:0, overflow:'hidden',
                background:'rgba(214,63,110,0.2)', border:'1.5px solid rgba(214,63,110,0.5)',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <span style={{ color:'var(--rose)', fontSize:13, fontWeight:700 }}>{profile?.name?.charAt(0) || '?'}</span>
              )}
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
      <div style={{ padding:'8px 16px 100px', display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--sub)', padding:48 }}>
            No {tab === 'Everyone' ? 'users' : tab.toLowerCase()} found
          </div>
        ) : filtered.map((u, i) => (
            <div key={u.id}
            onClick={() => router.push(`/profile/${u.id}`)}
            style={{ position:'relative', aspectRatio:'0.72', borderRadius:18,
              overflow:'hidden', cursor:'pointer', border:'1px solid var(--border)',
              background:'var(--card)', transition:'transform 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>

            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.name}
                style={{ width:'100%', height:'100%', objectFit:'cover',
                  position:'absolute', inset:0 }} />
            ) : (
              <div style={{ width:'100%', height:'100%', position:'absolute', inset:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: u.is_host
                  ? 'linear-gradient(145deg,rgba(201,164,106,0.6),rgba(201,164,106,0.2))'
                  : 'linear-gradient(145deg,var(--rose),rgba(214,63,110,0.4))' }}>
                <span style={{ fontSize:40, fontWeight:700, color:'#fff',
                  fontFamily:"'Cormorant Garamond', serif" }}>{u.name?.charAt(0)}</span>
              </div>
            )}

            {/* Host/Caller badge */}
            <span style={{
              position:'absolute', top:10, left:10,
              fontSize:9, fontWeight:700, letterSpacing:1, padding:'3px 8px',
              borderRadius:99,
              background: u.is_host ? 'rgba(201,164,106,0.85)' : 'rgba(214,63,110,0.85)',
              color:'#fff' }}>{u.is_host ? 'HOST' : 'CALLER'}</span>

            {isOnline(u.last_seen) && (
              <div style={{ position:'absolute', top:14, right:14,
                width:10, height:10, borderRadius:'50%', background:'#3DD68C',
                border:'2px solid #fff' }}/>
            )}

            {/* Gradient + info */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0,
              padding:'40px 12px 12px',
              background:'linear-gradient(to top, rgba(6,4,14,0.95), transparent)' }}>
              <div style={{ fontFamily:"'Cormorant Garamond', serif",
                fontSize:17, fontWeight:700, color:'#fff' }}>{u.name}</div>
                {u.country && (
                <div style={{ color:'rgba(255,255,255,0.7)', fontSize:13 }}>
                  {countryToFlag(u.country)} {COUNTRIES.find(c => c.code === u.country)?.name}
                </div>
              )}
              {u.is_host && u.total_reviews > 0 && (
                <div style={{ color:'var(--gold)', fontSize:11, marginTop:2 }}>
                  ⭐ {u.rating} ({u.total_reviews})
                </div>
              )}
              <div style={{ display:'inline-block', marginTop:6,
                background:'rgba(201,164,106,0.25)', borderRadius:99,
                padding:'3px 10px', fontSize:11, fontWeight:700, color:'var(--gold)' }}>
                {u.rate} ⚡/min
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
