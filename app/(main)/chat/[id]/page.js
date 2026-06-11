'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const { id } = useParams()
  const [host, setHost] = useState(null)
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { loadData() }, [id])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: profile }, { data: host }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', id).single(),
    ])
    setProfile(profile)
    setHost(host)

    // Load existing messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    // Subscribe to new messages
    supabase.channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        setMessages(m => [...m, payload.new])
      })
      .subscribe()
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Auto-translate if needed
    let translated = null
    if (host?.language && host.language !== 'English') {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input, targetLanguage: host.language }),
        })
        const data = await res.json()
        translated = data.translated
      } catch {}
    }

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: id,
      content: input.trim(),
      translated,
      language: 'English',
    })
    setInput('')
    setSending(false)
  }

  const isMe = (msg) => msg.sender_id === profile?.id

  return (
    <div style={{ height: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none',
            color: 'var(--sub)', cursor: 'pointer', fontSize: 22 }}>←</button>
        <div style={{ width: 38, height: 38, borderRadius: '50%',
          background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
          fontFamily: "'Cormorant Garamond', serif", flexShrink: 0 }}>
          {host?.name?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif",
            fontSize: 17, fontWeight: 700 }}>{host?.name}</div>
          <div style={{ fontSize: 11,
            color: host?.online ? 'var(--green)' : 'var(--sub)' }}>
            {host?.online ? '● Online now' : '○ Offline'}
          </div>
        </div>
        <button
          onClick={() => host?.online && router.push(`/call/${id}`)}
          disabled={!host?.online}
          style={{ background: host?.online
            ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--border)',
            border: 'none', color: '#fff', borderRadius: 99,
            padding: '7px 14px', cursor: host?.online ? 'pointer' : 'not-allowed',
            fontSize: 12, fontWeight: 600 }}>
          📞 Call
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--sub)',
            fontSize: 13, padding: '40px 0' }}>
            Start the conversation ✨
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex',
            flexDirection: isMe(msg) ? 'row-reverse' : 'row',
            gap: 8, marginBottom: 10, animation: 'fadeUp 0.25s ease' }}>
            {!isMe(msg) && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                fontFamily: "'Cormorant Garamond', serif", marginTop: 2 }}>
                {host?.name?.charAt(0)}
              </div>
            )}
            <div style={{ maxWidth: '75%' }}>
              <div style={{ padding: '11px 15px',
                borderRadius: isMe(msg)
                  ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isMe(msg)
                  ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--card)',
                fontSize: 14, lineHeight: 1.55, color: '#fff',
                boxShadow: isMe(msg) ? '0 4px 16px rgba(214,63,110,0.3)' : 'none' }}>
                {msg.content}
              </div>
              {msg.translated && !isMe(msg) && (
                <div style={{ fontSize: 11, color: 'var(--gold)',
                  marginTop: 4, paddingLeft: 4 }}>
                  🌐 Translated · {msg.language}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 18px', background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10, flexShrink: 0 }}>
        <input value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
          disabled={sending}
          style={{ flex: 1, padding: '12px 16px', background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 24,
            color: 'var(--text)', fontSize: 14 }}
          onFocus={e => e.target.style.borderColor = 'var(--gold)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        <button onClick={sendMessage} disabled={sending || !input.trim()}
          style={{ width: 46, height: 46, borderRadius: '50%', border: 'none',
            background: input.trim() && !sending
              ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--border)',
            color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>
          ➤
        </button>
      </div>
    </div>
  )
}