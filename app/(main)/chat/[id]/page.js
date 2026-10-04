'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isOnline } from '@/lib/isOnline'
import { ChevronLeft, Paperclip, Image as ImageIcon, FileText, X, Play, Phone, Send } from 'lucide-react'

const MAX_UPLOAD = 50 * 1024 * 1024
const GROUP_MS = 5 * 60 * 1000
const MY_GRADIENT = 'linear-gradient(135deg, var(--rose), #B8305F)'

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseGift(content) {
  try {
    const p = JSON.parse(content)
    return p && p.type === 'gift' ? p : null
  } catch { return null }
}

function fmtTime(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isSameDay(a, b) {
  const x = new Date(a), y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

function dayLabel(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (isSameDay(ts, now.toISOString())) return 'Today'
  const yest = new Date(); yest.setDate(now.getDate() - 1)
  if (isSameDay(ts, yest.toISOString())) return 'Yesterday'
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yr = d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + yr
}

function VideoThumb({ src }) {
  const videoRef = useRef(null)
  const [poster, setPoster] = useState(null)

  const captureFrame = () => {
    const video = videoRef.current
    if (!video || poster) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      setPoster(canvas.toDataURL('image/jpeg', 0.7))
      video.pause()
    } catch (e) {}
  }

  return (
    <>
      {poster && <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <video ref={videoRef} src={src} muted playsInline autoPlay crossOrigin="anonymous" preload="auto"
        onPlaying={captureFrame}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: poster ? 'none' : 'block' }} />
    </>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const { id } = useParams()
  const [host, setHost] = useState(null)
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [focused, setFocused] = useState(false)
  const bottomRef = useRef(null)
  const mediaInputRef = useRef(null)
  const docInputRef = useRef(null)
  const textareaRef = useRef(null)
  const sbRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    loadData()
    return () => {
      if (sbRef.current && channelRef.current) {
        sbRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 110) + 'px'
  }, [input])

  useEffect(() => {
    if (!viewer) return
    const onKey = e => { if (e.key === 'Escape') setViewer(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

  const loadData = async () => {
    const supabase = createClient()
    sbRef.current = supabase
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

    // Subscribe to new messages in this conversation only
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase.channel(`chat-${id}-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        const m = payload.new
        const mine = m.sender_id === user.id && m.receiver_id === id
        const theirs = m.sender_id === id && m.receiver_id === user.id
        if (!mine && !theirs) return
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
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

  const uploadAttachment = async (file) => {
    if (!file) return
    if (file.size > MAX_UPLOAD) { alert('This file is too large (max 50 MB).'); return }
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('ChatMedia')
        .upload(path, file, { contentType: file.type || 'application/octet-stream' })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('ChatMedia').getPublicUrl(path)
      const mediaType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video' : 'file'

      const { error: insErr } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: id,
        content: file.name,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        file_name: file.name,
        file_size: file.size,
      })
      if (insErr) throw insErr
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Something went wrong.'))
    } finally {
      setUploading(false)
    }
  }

  const onPickFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setMenuOpen(false)
    uploadAttachment(file)
  }

  const isMe = (msg) => msg.sender_id === profile?.id
  const hostOnline = isOnline(host?.last_seen)
  const timeStyle = { fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'right', marginTop: 2 }
  const canSend = !!input.trim() && !sending

  return (
    <div style={{ height: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 640, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" onChange={onPickFile} style={{ display: 'none' }} />
      <input ref={docInputRef} type="file" onChange={onPickFile} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()} aria-label="Back"
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--card)',
            border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div onClick={() => router.push(`/profile/${id}`)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}>
          <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
              background: 'rgba(214,63,110,0.2)', border: '1px solid rgba(214,63,110,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {host?.avatar_url ? (
                <img src={host.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--rose)',
                  fontFamily: "'Cormorant Garamond', serif" }}>{host?.name?.charAt(0)}</span>
              )}
            </div>
            {hostOnline && (
              <div style={{ position: 'absolute', right: -1, bottom: -1, width: 11, height: 11,
                borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg)' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{host?.name}</div>
            <div style={{ fontSize: 11, color: hostOnline ? 'var(--green)' : 'var(--sub)' }}>
              {hostOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <button
          onClick={() => hostOnline && router.push(`/call/new/${id}`)}
          disabled={!hostOnline} aria-label="Call"
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', color: '#fff',
            background: hostOnline ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--border)',
            cursor: hostOnline ? 'pointer' : 'not-allowed', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Phone size={18} />
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
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const me = isMe(msg)
          const gift = parseGift(msg.content)
          const newDay = !prev || !isSameDay(prev.created_at, msg.created_at)
          const sameAsNext = !!next && next.sender_id === msg.sender_id &&
            isSameDay(next.created_at, msg.created_at) &&
            (new Date(next.created_at) - new Date(msg.created_at)) < GROUP_MS
          const tail = sameAsNext ? 16 : 4
          const radius = me ? `16px 16px ${tail}px 16px` : `16px 16px 16px ${tail}px`
          const bg = me ? MY_GRADIENT : 'var(--card)'
          const border = me ? 'none' : '1px solid var(--border)'
          const time = fmtTime(msg.created_at)

          return (
            <div key={msg.id || i}>
              {newDay && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                  <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, padding: '4px 12px',
                    fontSize: 11, color: 'var(--sub)', fontWeight: 500 }}>{dayLabel(msg.created_at)}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: me ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 8, marginBottom: sameAsNext ? 2 : 10,
                animation: 'fadeUp 0.25s ease' }}>
                {!me && (
                  sameAsNext ? (
                    <div style={{ width: 28, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                      background: 'rgba(214,63,110,0.2)', border: '1px solid rgba(214,63,110,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {host?.avatar_url ? (
                        <img src={host.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)',
                          fontFamily: "'Cormorant Garamond', serif" }}>{host?.name?.charAt(0)}</span>
                      )}
                    </div>
                  )
                )}
                <div style={{ maxWidth: '78%' }}>
                  {msg.media_type === 'image' ? (
                    <div onClick={() => setViewer({ type: 'image', url: msg.media_url })}
                      style={{ position: 'relative', width: 220, height: 220, borderRadius: radius,
                        overflow: 'hidden', cursor: 'pointer', background: 'var(--card)' }}>
                      <img src={msg.media_url} alt={msg.file_name || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.45)',
                        color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 8 }}>{time}</span>
                    </div>
                  ) : msg.media_type === 'video' ? (
                    <div onClick={() => setViewer({ type: 'video', url: msg.media_url })}
                      style={{ position: 'relative', width: 220, height: 220, borderRadius: radius,
                        overflow: 'hidden', cursor: 'pointer', background: 'var(--card)' }}>
                      <VideoThumb src={msg.media_url} />
                      <div style={{ position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: 22,
                        background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                      </div>
                      <span style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.45)',
                        color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 8 }}>{time}</span>
                    </div>
                  ) : msg.media_type === 'file' ? (
                    <div style={{ padding: '8px 12px', borderRadius: radius, background: bg, border, color: '#fff' }}>
                      <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200,
                          color: '#fff', textDecoration: 'none' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                            {msg.file_name || msg.content}
                          </div>
                          {msg.file_size ? (
                            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{formatFileSize(msg.file_size)}</div>
                          ) : null}
                        </div>
                      </a>
                      <div style={timeStyle}>{time}</div>
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', borderRadius: radius, background: bg, border,
                      color: '#fff', boxShadow: me ? '0 4px 16px rgba(214,63,110,0.25)' : 'none' }}>
                      <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {gift ? `🎁 ${gift.name} · ⚡${gift.cost}` : msg.content}
                      </div>
                      <div style={timeStyle}>{time}</div>
                    </div>
                  )}
                  {msg.translated && !me && !msg.media_type && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, paddingLeft: 4 }}>
                      🌐 Translated · {msg.language}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'relative', padding: '10px 14px 14px', background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 14, zIndex: 20,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
              padding: 6, minWidth: 190, boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
              <button onClick={() => mediaInputRef.current?.click()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none',
                  border: 'none', color: 'var(--text)', fontSize: 14, padding: '10px 12px',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                <ImageIcon size={18} /> Photo or Video
              </button>
              <button onClick={() => docInputRef.current?.click()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none',
                  border: 'none', color: 'var(--text)', fontSize: 14, padding: '10px 12px',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                <FileText size={18} /> Document
              </button>
            </div>
          </>
        )}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', minHeight: 44,
          background: 'rgba(255,255,255,0.06)', borderRadius: 22, padding: '0 6px',
          border: `1px solid ${focused ? 'var(--gold)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
          <button onClick={() => setMenuOpen(o => !o)} disabled={uploading} aria-label="Attach"
            style={{ width: 36, height: 42, background: 'none', border: 'none', color: 'var(--sub)',
              cursor: uploading ? 'wait' : 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {uploading ? <span style={{ fontSize: 14 }}>…</span> : <Paperclip size={20} />}
          </button>
          <textarea ref={textareaRef} rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                sendMessage()
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Type a message…"
            style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 14, lineHeight: '20px', padding: '11px 6px',
              maxHeight: 110, fontFamily: 'inherit', overflowY: 'auto' }} />
        </div>
        <button onClick={sendMessage} disabled={!canSend} aria-label="Send"
          style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: canSend ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'rgba(255,255,255,0.1)',
            color: canSend ? '#fff' : 'var(--sub)', cursor: canSend ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={18} />
        </button>
      </div>

      {/* Full-screen viewer */}
      {viewer && (
        <div onClick={() => setViewer(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {viewer.type === 'image' ? (
            <img src={viewer.url} alt="" onClick={e => e.stopPropagation()}
              style={{ maxWidth: '96vw', maxHeight: '92vh', objectFit: 'contain' }} />
          ) : (
            <video src={viewer.url} controls autoPlay playsInline onClick={e => e.stopPropagation()}
              style={{ maxWidth: '96vw', maxHeight: '92vh' }} />
          )}
          <button onClick={() => setViewer(null)} aria-label="Close"
            style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}