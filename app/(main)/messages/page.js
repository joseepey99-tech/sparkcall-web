'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return }

    const latestByPartner = {}
    for (const m of msgs) {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (!partnerId) continue
      if (!latestByPartner[partnerId]) latestByPartner[partnerId] = m
    }

    const partnerIds = Object.keys(latestByPartner)
    const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', partnerIds)
    const profileMap = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const list = partnerIds.map(pid => ({
      partnerId: pid,
      partner: profileMap[pid],
      lastMessage: latestByPartner[pid],
    })).sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at))

    setConversations(list)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 640, margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
        Messages
      </h1>
      {loading ? (
        <div style={{ color: 'var(--sub)', textAlign: 'center', marginTop: 40 }}>Loading…</div>
      ) : conversations.length === 0 ? (
        <div style={{ color: 'var(--sub)', textAlign: 'center', marginTop: 40 }}>No conversations yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {conversations.map(c => {
            const isGift = (() => { try { return JSON.parse(c.lastMessage.content)?.type === 'gift' } catch { return false } })()
            return (
              <div key={c.partnerId} onClick={() => router.push(`/chat/${c.partnerId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(214,63,110,0.2)',
                  border: '1px solid rgba(214,63,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0 }}>
                  {c.partner?.avatar_url ? (
                    <img src={c.partner.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--rose)', fontSize: 18, fontWeight: 700 }}>{c.partner?.name?.charAt(0) || '?'}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.partner?.name || 'Unknown'}</div>
                  <div style={{ color: 'var(--sub)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isGift ? '🎁 Sent a gift' : c.lastMessage.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}