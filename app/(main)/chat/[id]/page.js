'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isOnline } from '@/lib/isOnline'
import { ChevronLeft, Paperclip, Image as ImageIcon, FileText, X, Play } from 'lucide-react'

const MAX_UPLOAD = 50 * 1024 * 1024

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
  const bottomRef = useRef(null)
  const mediaInputRef = useRef(null)
  const docInputRef = useRef(null)
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

  return (
    <div style={{ height: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 640, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" onChange={onPickFile} style={{ display: 'none' }} />
      <input ref={docInputRef} type="file" onChange={onPickFile} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none',
           color: 'var(--sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={22} /></button>
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
            color: isOnline(host?.last_seen) ? 'var(--green)' : 'var(--sub)' }}>
            {isOnline(host?.last_seen) ? '● Online now' : '○ Offline'}
          </div>
        </div>
        <button
          onClick={() => isOnline(host?.last_seen) && router.push(`/call/new/${id}`)}
          disabled={!isOnline(host?.last_seen)}
          style={{ background: isOnline(host?.last_seen)
            ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--border)',
            border: 'none', color: '#fff', borderRadius: 99,
            padding: '7px 14px', cursor: isOnline(host?.last_seen) ? 'pointer' : 'not-allowed',
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
        {messages.map((msg, i) => {
          const gift = parseGift(msg.content)
          const radius = isMe(msg) ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
          const bg = isMe(msg) ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--card)'
          return (
            <div key={msg.id || i} style={{ display: 'flex',
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
                {msg.media_type === 'image' ? (
                  <div onClick={() => setViewer({ type: 'image', url: msg.media_url })}
                    style={{ width: 220, height: 220, borderRadius: radius, overflow: 'hidden',
                      cursor: 'pointer', background: 'var(--card)' }}>
                    <img src={msg.media_url} alt={msg.file_name || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
                  </div>
                ) : msg.media_type === 'file' ? (
                  <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200,
                      padding: '10px 12px', borderRadius: radius, background: bg, color: '#fff',
                      textDecoration: 'none', border: isMe(msg) ? 'none' : '1px solid var(--border)' }}>
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
                ) : (
                  <div style={{ padding: '11px 15px',
                    borderRadius: radius,
                    background: bg,
                    fontSize: 14, lineHeight: 1.55, color: '#fff',
                    boxShadow: isMe(msg) ? '0 4px 16px rgba(214,63,110,0.3)' : 'none' }}>
                    {gift ? `🎁 ${gift.name} · ⚡${gift.cost}` : msg.content}
                  </div>
                )}
                {msg.translated && !isMe(msg) && !msg.media_type && (
                  <div style={{ fontSize: 11, color: 'var(--gold)',
                    marginTop: 4, paddingLeft: 4 }}>
                    🌐 Translated · {msg.language}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'relative', padding: '12px 18px', background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10, flexShrink: 0 }}>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 18, zIndex: 20,
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
        <button onClick={() => setMenuOpen(o => !o)} disabled={uploading} aria-label="Attach"
          style={{ width: 46, height: 46, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--sub)', cursor: uploading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {uploading ? <span style={{ fontSize: 14 }}>…</span> : <Paperclip size={20} />}
        </button>
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