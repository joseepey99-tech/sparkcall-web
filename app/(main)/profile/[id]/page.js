'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'
import { isOnline } from '@/lib/isOnline'
import { countryToFlag, COUNTRIES } from '@/lib/countries'
import { ChevronLeft } from 'lucide-react'

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
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      setPoster(canvas.toDataURL('image/jpeg', 0.7))
      video.pause()
    } catch (e) {}
  }

  return (
    <>
      {poster && <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        autoPlay
        crossOrigin="anonymous"
        preload="auto"
        onPlaying={captureFrame}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: poster ? 'none' : 'block' }}
      />
    </>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { id } = useParams()
  const [host, setHost] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
    const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState([])
  const [playingIndex, setPlayingIndex] = useState(null)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUser(user)
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
    const { data: host } = await supabase
      .from('profiles').select('*').eq('id', id).single()
    setHost(host)
    const { data: v } = await supabase
      .from('profile_videos').select('*').eq('user_id', id).order('created_at', { ascending: false })
    setVideos(v || [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)' }}>
      <Mark size={48} glow={true} />
    </div>
  )

  if (!host) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', color: 'var(--sub)' }}>
      Host not found.
    </div>
  )

  const discount = profile?.premium === 'platinum' ? 0.8
    : profile?.premium === 'gold' ? 0.9 : 1
  const effectiveRate = Math.round(host.rate * discount)
  const hasDiscount = discount < 1
    const canAfford = (profile?.credits || 0) >= effectiveRate
  const hostOnline = isOnline(host.last_seen)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      maxWidth: 900, margin: '0 auto', animation: 'fadeUp 0.3s ease', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()}
          style={{ background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 99, width: 36, height: 36,
            cursor: 'pointer', fontSize: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} /></button>
        <span style={{ fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20, fontWeight: 700 }}>{host.name}</span>
      </div>

            {/* Hero */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1', maxHeight: 420 }}>
        {host.avatar_url ? (
          <img src={host.avatar_url} alt={host.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%',
            background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 72, fontWeight: 700, color: '#fff',
              fontFamily: "'Cormorant Garamond', serif" }}>{host.name?.charAt(0)}</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '60px 24px 20px',
          background: 'linear-gradient(to top, rgba(6,4,14,0.95), transparent)' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28, fontWeight: 700, marginBottom: 4, color: '#fff' }}>{host.name}</h2>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 }}>
            {host.country ? `${countryToFlag(host.country)} ${COUNTRIES.find(c => c.code === host.country)?.name}` : '—'}
          </div>
          <div style={{ color: 'var(--gold)', fontSize: 13 }}>
            {'★'.repeat(Math.floor(host.rating || 0))}{' '}
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
              {host.rating || 'New'} · {host.total_calls || 0} calls
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600,
            color: hostOnline ? 'var(--green)' : 'rgba(255,255,255,0.6)' }}>
            {hostOnline ? '● Online now' : '○ Offline'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 120px' }}>

        {/* Bio */}
        {host.bio && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 18, marginBottom: 14 }}>
            <div style={{ color: 'var(--sub)', fontSize: 10, fontWeight: 600,
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>About</div>
                        <p style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: 14 }}>{host.bio}</p>
          </div>
        )}

                {videos.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: 'var(--sub)', fontSize: 10, fontWeight: 600,
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9, textAlign: 'center' }}>Videos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
              {videos.map((v, i) => (
                <div key={v.id} onClick={() => setPlayingIndex(i)}
                  style={{ position: 'relative', width: 160, height: 230,
                    borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)',
                    background: 'var(--card)', cursor: 'pointer' }}>
                  <VideoThumb src={v.video_url} />
                  <div style={{ position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', width: 56, height: 56, borderRadius: 28,
                    background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 22, marginLeft: 3 }}>▶</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, left: 8,
                    background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px',
                    color: '#fff', fontSize: 11 }}>
                    {v.duration_seconds}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rate card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(201,164,106,0.1), var(--card))',
          border: '1px solid rgba(201,164,106,0.3)',
          borderRadius: 18, padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'var(--sub)', fontSize: 10, fontWeight: 600,
                letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Rate per minute</div>
              {hasDiscount ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 32, color: 'var(--gold)', fontWeight: 700 }}>
                    {effectiveRate} ⚡
                  </span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 18, color: 'var(--sub)', textDecoration: 'line-through' }}>
                    {host.rate} ⚡
                  </span>
                </div>
              ) : (
                <span style={{ fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 32, color: 'var(--gold)', fontWeight: 700 }}>
                  {host.rate} ⚡<span style={{ fontSize: 15, color: 'var(--sub)',
                    fontWeight: 400 }}> /min</span>
                </span>
              )}
              {hasDiscount && (
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                  {profile.premium === 'platinum' ? '👑 20%' : '⭐ 10%'} premium discount
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--sub)', fontSize: 11 }}>Your balance</div>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 20,
                fontFamily: "'Cormorant Garamond', serif" }}>⚡ {profile?.credits || 0}</div>
              <div style={{ color: 'var(--sub)', fontSize: 11 }}>
                ≈ {Math.floor((profile?.credits || 0) / effectiveRate)} min
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button onClick={() => router.push(`/chat/${host.id}`)}
            style={{ flex: 1, padding: '14px', borderRadius: 14,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            💬 Chat First
          </button>
          <button
            onClick={() => canAfford && hostOnline && router.push(`/call/new/${host.id}`)}
            disabled={!hostOnline || !canAfford}
            style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none',
              background: hostOnline && canAfford
                ? 'linear-gradient(135deg, var(--rose), #A02050)'
                : 'var(--border)',
              color: hostOnline && canAfford ? '#fff' : 'var(--sub)',
              fontSize: 14, fontWeight: 700,
              cursor: hostOnline && canAfford ? 'pointer' : 'not-allowed',
              boxShadow: hostOnline && canAfford
                ? '0 8px 30px rgba(214,63,110,0.3)' : 'none' }}>
            {!hostOnline ? '🔴 Offline'
              : !canAfford ? '⚡ Not enough Sparks'
              : '📞 Start Call'}
          </button>
        </div>

                {!canAfford && (
          <div onClick={() => router.push('/credits')}
            style={{ textAlign: 'center', color: 'var(--gold)', fontSize: 13,
              cursor: 'pointer', padding: 8 }}>
            ⚡ Top up Sparks to call →
          </div>
        )}
      </div>

      {playingIndex !== null && videos[playingIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src={videos[playingIndex].video_url} controls autoPlay playsInline
            style={{ maxWidth: '100%', maxHeight: '100%' }} />
          <button onClick={() => setPlayingIndex(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 18,
              cursor: 'pointer' }}>✕</button>
          {playingIndex > 0 && (
            <button onClick={() => setPlayingIndex(playingIndex - 1)}
              style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.15)',
                border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>‹</button>
          )}
          {playingIndex < videos.length - 1 && (
            <button onClick={() => setPlayingIndex(playingIndex + 1)}
              style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.15)',
                border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>›</button>
          )}
        </div>
      )}
    </div>
  )
}
