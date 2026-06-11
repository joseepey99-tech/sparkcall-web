'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const GIFTS = [
  { id: 'rose',   emoji: '🌹', name: 'Rose',    cost: 5   },
  { id: 'kiss',   emoji: '💋', name: 'Kiss',    cost: 8   },
  { id: 'wine',   emoji: '🍷', name: 'Wine',    cost: 15  },
  { id: 'fire',   emoji: '🔥', name: 'Flame',   cost: 25  },
  { id: 'gem',    emoji: '💎', name: 'Diamond', cost: 40  },
  { id: 'crown',  emoji: '👑', name: 'Crown',   cost: 80  },
  { id: 'rocket', emoji: '🚀', name: 'Rocket',  cost: 150 },
  { id: 'yacht',  emoji: '⛵', name: 'Yacht',   cost: 350 },
]

export default function CallPage() {
  const router = useRouter()
  const { id } = useParams()
  const [host, setHost] = useState(null)
  const [profile, setProfile] = useState(null)
  const [callData, setCallData] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [flyingGift, setFlyingGift] = useState(null)
  const [lastGift, setLastGift] = useState(null)
  const [ending, setEnding] = useState(false)
  const [credits, setCredits] = useState(0)
  const [showHint, setShowHint] = useState(true)
  const callFrameRef = useRef(null)
  const containerRef = useRef(null)
  const timerRef = useRef(null)
  const callRef = useRef(null)

  useEffect(() => {
    initCall()
    const hintTimer = setTimeout(() => setShowHint(false), 4000)
    return () => {
      clearTimeout(hintTimer)
      clearInterval(timerRef.current)
      if (callRef.current) callRef.current.destroy()
    }
  }, [id])

  const initCall = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: profile }, { data: host }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', id).single(),
    ])
    setProfile(profile)
    setHost(host)
    setCredits(profile.credits)

    // Create room via API
    const res = await fetch('/api/calls/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: id }),
    })
    const data = await res.json()
    if (!data.roomUrl) { router.back(); return }
    setCallData(data)

    // Load Daily.co
    const { default: DailyIframe } = await import('@daily-co/daily-js')
    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        border: 'none',
      },
      showLeaveButton: false,
      showFullscreenButton: false,
    })
    callRef.current = callFrame
    callFrameRef.current = callFrame

    await callFrame.join({ url: data.roomUrl })

    // Start timer
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const getRate = () => {
    if (!profile || !host) return 0
    const discount = profile.premium === 'platinum' ? 0.8
      : profile.premium === 'gold' ? 0.9 : 1
    return Math.round(host.rate * discount)
  }

  const getSparksSpent = () => Math.floor((seconds / 60) * getRate())

  const endCall = async () => {
    if (ending) return
    setEnding(true)
    clearInterval(timerRef.current)
    if (callRef.current) callRef.current.destroy()

    const sparksSpent = getSparksSpent()
    await fetch('/api/calls/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: callData?.callId,
        roomName: callData?.roomName,
        durationSeconds: seconds,
        sparksSpent,
      }),
    })
    router.push(`/review/${id}?duration=${seconds}&cost=${sparksSpent}`)
  }

  const sendGift = async (gift) => {
    if (credits < gift.cost) return
    setCredits(c => c - gift.cost)
    setLastGift(gift)
    setFlyingGift(gift)
    setGiftOpen(false)
    setTimeout(() => setFlyingGift(null), 1800)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('gifts').insert({
      sender_id: user.id,
      receiver_id: id,
      call_id: callData?.callId,
      gift_type: gift.id,
      cost_sparks: gift.cost,
    })
    await supabase.rpc('add_sparks', { user_id: user.id, amount: -gift.cost })
  }

  const sendChatMessage = () => {
    if (!chatInput.trim()) return
    setChatMessages(m => [...m, { from: 'me', text: chatInput.trim() }])
    setChatInput('')
  }

  return (
    <div style={{ height: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', userSelect: 'none' }}>

      {/* Daily.co video container */}
      <div ref={containerRef}
        onClick={() => { if (!giftOpen) setChatVisible(v => !v) }}
        style={{ flex: 1, position: 'relative', cursor: 'pointer' }}>

        {/* Loading state */}
        {!callData && (
          <div style={{ position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(ellipse at 45% 45%, rgba(214,63,110,0.4), #000)`,
            gap: 16 }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%',
              background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, fontWeight: 700, color: '#fff',
              fontFamily: "'Cormorant Garamond', serif" }}>
              {host?.name?.charAt(0)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              Connecting…
            </div>
          </div>
        )}

        {/* Flying gift animation */}
        {flyingGift && (
          <div style={{ position: 'absolute', bottom: '20%', left: '50%',
            transform: 'translateX(-50%)', fontSize: 72, zIndex: 200,
            animation: 'giftFly 1.8s ease forwards', pointerEvents: 'none' }}>
            {flyingGift.emoji}
          </div>
        )}

        {/* Last gift toast */}
        {lastGift && (
          <div style={{ position: 'absolute', top: 20, left: 20,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)',
            padding: '8px 14px', borderRadius: 12,
            border: '1px solid rgba(201,164,106,0.4)', pointerEvents: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>You sent</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {lastGift.emoji} {lastGift.name}
            </div>
          </div>
        )}

        {/* Timer */}
        <div style={{ position: 'absolute', top: 20, right: 20,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)',
          padding: '10px 16px', borderRadius: 14,
          border: '1px solid rgba(201,164,106,0.3)', textAlign: 'right',
          pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700,
            color: '#fff' }}>{fmt(seconds)}</div>
          <div style={{ color: 'var(--gold)', fontSize: 13 }}>
            ⚡ {getSparksSpent()} spent
          </div>
          <div style={{ color: 'var(--sub)', fontSize: 10 }}>
            Balance: {credits}
          </div>
        </div>

        {/* Chat hint */}
        {showHint && !chatVisible && (
          <div style={{ position: 'absolute', bottom: 80, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.6)', padding: '6px 16px',
            borderRadius: 99, fontSize: 11, pointerEvents: 'none',
            whiteSpace: 'nowrap' }}>
            💬 Tap screen to chat
          </div>
        )}
      </div>

      {/* In-call chat overlay */}
      {chatVisible && (
        <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0,
          height: '45%', zIndex: 90, display: 'flex', flexDirection: 'column',
          background: 'rgba(6,4,14,0.9)', backdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(201,164,106,0.2)' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--sub)' }}>
              💬 Chat with {host?.name?.split(' ')[0]}
            </span>
            <button onClick={() => setChatVisible(false)}
              style={{ background: 'none', border: 'none',
                color: 'var(--sub)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex',
                justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start',
                marginBottom: 8 }}>
                <div style={{ maxWidth: '75%', padding: '9px 13px',
                  borderRadius: m.from === 'me'
                    ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.from === 'me'
                    ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--card)',
                  fontSize: 13, color: '#fff' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8 }}>
            <input value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
              placeholder="Message…"
              style={{ flex: 1, padding: '9px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, color: '#fff', fontSize: 13 }} />
            <button onClick={sendChatMessage}
              style={{ width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: chatInput.trim()
                  ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 15, cursor: 'pointer' }}>➤</button>
          </div>
        </div>
      )}

      {/* Gift panel */}
      {giftOpen && (
        <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0,
          zIndex: 150, background: 'rgba(12,8,23,0.98)',
          backdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(201,164,106,0.3)', padding: '20px 18px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20, fontWeight: 700 }}>
                Send a <em style={{ color: 'var(--gold)' }}>Gift</em>
              </div>
              <div style={{ color: 'var(--sub)', fontSize: 12, marginTop: 2 }}>
                Balance: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                  ⚡ {credits}
                </span>
              </div>
            </div>
            <button onClick={() => setGiftOpen(false)}
              style={{ background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--sub)', borderRadius: 99, width: 32, height: 32,
                cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {GIFTS.map(g => {
              const canAfford = credits >= g.cost
              return (
                <button key={g.id} onClick={() => sendGift(g)}
                  disabled={!canAfford}
                  style={{ padding: '12px 6px', borderRadius: 14,
                    border: `1px solid ${canAfford ? 'var(--border)' : 'var(--border)'}`,
                    background: canAfford ? 'var(--card)' : 'rgba(19,14,34,0.5)',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4, opacity: canAfford ? 1 : 0.45 }}>
                  <span style={{ fontSize: 28 }}>{g.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 600,
                    color: 'var(--text)' }}>{g.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--gold)' }}>⚡ {g.cost}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '16px 28px 32px', flexShrink: 0, zIndex: 95,
        background: 'linear-gradient(to top, rgba(0,0,0,0.97), rgba(0,0,0,0.3))',
        display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'center' }}>
        {[
          { icon: muted ? '🔇' : '🎤', active: muted, fn: () => {
            setMuted(!muted)
            if (callRef.current) callRef.current.setLocalAudio(muted)
          }},
          { icon: camOff ? '📷' : '📹', active: camOff, fn: () => {
            setCamOff(!camOff)
            if (callRef.current) callRef.current.setLocalVideo(camOff)
          }},
        ].map((b, i) => (
          <button key={i} onClick={b.fn}
            style={{ width: 54, height: 54, borderRadius: '50%', border: 'none',
              background: b.active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {b.icon}
          </button>
        ))}

        {/* Chat toggle */}
        <button onClick={() => { setChatVisible(v => !v); setGiftOpen(false) }}
          style={{ width: 54, height: 54, borderRadius: '50%', border: 'none',
            background: chatVisible ? 'rgba(214,63,110,0.2)' : 'rgba(255,255,255,0.08)',
            color: chatVisible ? 'var(--rose)' : '#fff',
            fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: chatVisible ? '0 0 20px rgba(214,63,110,0.4)' : 'none' }}>
          💬
        </button>

        {/* Gift toggle */}
        <button onClick={() => { setGiftOpen(v => !v); setChatVisible(false) }}
          style={{ width: 54, height: 54, borderRadius: '50%', border: 'none',
            background: giftOpen ? 'rgba(201,164,106,0.2)' : 'rgba(201,164,106,0.1)',
            color: 'var(--gold)', fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: giftOpen ? '0 0 20px rgba(201,164,106,0.4)' : 'none' }}>
          🎁
        </button>

        {/* End call */}
        <button onClick={endCall} disabled={ending}
          style={{ width: 68, height: 68, borderRadius: '50%', border: 'none',
            background: ending ? '#555' : 'linear-gradient(135deg, var(--rose), #A02050)',
            color: '#fff', fontSize: 26, cursor: ending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'scale(1.08)',
            boxShadow: ending ? 'none' : '0 0 32px rgba(214,63,110,0.5)',
            transition: 'all 0.3s' }}>
          📵
        </button>
      </div>

      <style>{`
        @keyframes giftFly {
          0%   { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          60%  { transform: translateX(-50%) translateY(-55vh) scale(2.4); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-80vh) scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}