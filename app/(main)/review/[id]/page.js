'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function ReviewContent() {
  const router = useRouter()
  const { id } = useParams()
  const searchParams = useSearchParams()
  const duration = searchParams.get('duration') || 0
  const cost = searchParams.get('cost') || 0
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)

  const fmt = s => `${Math.floor(s / 60)}m ${s % 60}s`

  const submit = async () => {
    if (!stars) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('reviews').insert({
      caller_id: user.id,
      host_id: id,
      rating: stars,
      comment,
    })
    setDone(true)
    setTimeout(() => router.push('/home'), 2000)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.6s ease' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif",
          fontSize: 30, fontWeight: 700, marginBottom: 8 }}>Thank you!</div>
        <div style={{ color: 'var(--sub)' }}>Your review helps our community.</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 28, animation: 'fadeIn 0.4s ease' }}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--gold)',
          fontWeight: 600, textTransform: 'uppercase', marginBottom: 14 }}>
          Call Ended
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          How was the call?
        </div>
        <div style={{ color: 'var(--sub)', fontSize: 13 }}>
          Duration: {fmt(duration)} · ⚡ {cost} Sparks spent
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[1,2,3,4,5].map(n => (
          <span key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setStars(n)}
            style={{ fontSize: 44, cursor: 'pointer',
              color: (hovered || stars) >= n ? 'var(--gold)' : 'var(--border)',
              transition: 'all 0.15s',
              transform: (hovered || stars) >= n ? 'scale(1.2)' : 'scale(1)',
              display: 'inline-block' }}>★</span>
        ))}
      </div>

      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Leave a comment (optional)…" rows={3}
        style={{ width: '100%', maxWidth: 400, padding: '13px 16px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, color: 'var(--text)', fontSize: 14,
          resize: 'none', marginBottom: 16 }}
        onFocus={e => e.target.style.borderColor = 'var(--gold)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'} />

      <div style={{ width: '100%', maxWidth: 400, display: 'flex',
        flexDirection: 'column', gap: 10 }}>
        <button onClick={submit} disabled={!stars}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: stars
              ? 'linear-gradient(135deg, var(--gold), #A07840)' : 'var(--border)',
            color: stars ? '#0C0817' : 'var(--sub)',
            fontSize: 14, fontWeight: 600,
            cursor: stars ? 'pointer' : 'not-allowed' }}>
          {stars ? 'Submit Review ✦' : 'Tap a star to rate'}
        </button>
        <button onClick={() => router.push('/home')}
          style={{ background: 'none', border: 'none',
            color: 'var(--sub)', cursor: 'pointer', fontSize: 13 }}>
          Skip
        </button>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--sub)' }}>Loading…</div>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  )
}