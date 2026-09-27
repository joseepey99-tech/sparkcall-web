'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function HistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${user.id},host_id.eq.${user.id}`)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })

    if (!calls || calls.length === 0) { setItems([]); setLoading(false); return }

    const otherIds = [...new Set(calls.map(c => c.caller_id === user.id ? c.host_id : c.caller_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds)
    const profileMap = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const callIds = calls.map(c => c.id)
    const { data: reviews } = await supabase.from('reviews').select('*').in('call_id', callIds)

    const merged = calls.map(c => {
      const iAmHost = c.host_id === user.id
      const otherId = iAmHost ? c.caller_id : c.host_id
      const myRole = iAmHost ? 'host' : 'caller'
      const myReview = reviews?.find(r => r.call_id === c.id && r.reviewer_role === myRole)
      return { ...c, otherName: profileMap[otherId]?.name || 'Unknown', otherId, iAmHost, myReview }
    })

    setItems(merged)
    setLoading(false)
  }

  const fmt = (s) => `${Math.floor((s || 0) / 60)}m ${(s || 0) % 60}s`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()}
          style={{ background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 99, width: 36, height: 36,
            cursor: 'pointer', fontSize: 16 }}>←</button>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700 }}>Call History</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--sub)', marginTop: 40 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--sub)', marginTop: 40 }}>No calls yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{item.otherName}</span>
                <span style={{ color: 'var(--sub)', fontSize: 11 }}>{item.iAmHost ? 'You hosted' : 'You called'}</span>
              </div>
              <div style={{ color: 'var(--sub)', fontSize: 13, marginTop: 4 }}>
                {fmt(item.duration_seconds)} · ⚡{item.sparks_spent || 0}
              </div>
              {item.myReview ? (
                <div style={{ color: 'var(--gold)', fontSize: 13, marginTop: 6 }}>
                  ⭐ You rated {item.myReview.rating}/5
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/review/${item.otherId}?duration=${item.duration_seconds}&cost=${item.sparks_spent}&isHost=${item.iAmHost}&callId=${item.id}`)}
                  style={{ width: '100%', marginTop: 8, padding: '8px', borderRadius: 10, border: 'none',
                    background: 'var(--rose)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Leave a review
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}