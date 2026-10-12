'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CallVideo from '@/components/CallVideo'
import CallControls from '@/components/CallControls'
import { GIFTS, TIER_ORDER, TIER_LABELS, giftEmoji, parseGift, fmtCost } from '@/lib/gifts'

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function Avatar({ user, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'linear-gradient(145deg, var(--rose), rgba(214,63,110,0.4))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.4),
      fontFamily: "'Cormorant Garamond', serif" }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (user?.name?.charAt(0) || '')}
    </div>
  )
}

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
  const [connected, setConnected] = useState(false)
  const [showHint, setShowHint] = useState(true)

  const timerRef = useRef(null)
  const chatEndRef = useRef(null)
  const sbRef = useRef(null)
  const channelRef = useRef(null)
  const userIdRef = useRef(null)
  const secondsRef = useRef(0)
  const spentRef = useRef(0)
  const endedRef = useRef(false)
  const connectedRef = useRef(false)
  const giftOpenRef = useRef(false)

  // Derived values
  const discount = profile?.premium === 'platinum' ? 0.8 : profile?.premium === 'gold' ? 0.9 : 1
  const rate = profile && host ? Math.round(host.rate * discount) : 0
  const spent = Math.floor((seconds / 60) * rate)
  const remaining = credits - spent
  const lowCredits = connected && rate > 0 && remaining > 0 && remaining <= rate * 2
  secondsRef.current = seconds
  spentRef.current = spent
  giftOpenRef.current = giftOpen

  const addMessage = (text, fromMe, msgId) => {
    setChatMessages(m => [...m.slice(-50), { id: msgId || String(Date.now() + Math.random()), text, fromMe }])
  }

  // The clock starts when the host is actually in the call
  const startTimer = () => {
    connectedRef.current = true
    setConnected(true)
    if (!timerRef.current) timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const endCall = async () => {
    if (ending || endedRef.current) return
    endedRef.current = true
    setEnding(true)
    clearInterval(timerRef.current)

    let finalSeconds = seconds, finalSpent = spent
    try {
    const endRes = await fetch('/api/calls/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: callData?.callId,
        roomName: callData?.roomName,
             }),
    })
    const out = await endRes.json()
    if (out?.success) { finalSeconds = out.seconds; finalSpent = out.sparks }
    } catch (e) {}
        router.push(`/review/${id}?duration=${finalSeconds}&cost=${finalSpent}&isHost=false&callId=${callData?.callId || ''}`)
  }

  // Hanging up before the host joined cancels the call
  const cancelCall = async () => {
    if (ending || endedRef.current) return
    endedRef.current = true
    setEnding(true)
    clearInterval(timerRef.current)
    try {
      await fetch('/api/calls/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: callData?.callId }),
      })
    } catch (e) {}
    router.back()
  }

  const hangUp = () => (connectedRef.current ? endCall() : cancelCall())

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || !userIdRef.current || !callData) return
    setChatInput('')
    addMessage(text, true)
    await sbRef.current.from('messages').insert({
      sender_id: userIdRef.current,
      receiver_id: id,
      call_id: callData.callId,
      content: text,
    })
  }

  const sendGift = async (gift) => {
    if (remaining < gift.cost || !callData || !userIdRef.current) return
    setCredits(c => c - gift.cost)
    setLastGift(gift)
    setFlyingGift(gift)
    setGiftOpen(false)
    setTimeout(() => setFlyingGift(null), 1800)

    const content = JSON.stringify({ type: 'gift', id: gift.id, name: gift.name, cost: gift.cost })
    addMessage(content, true)
    const sb = sbRef.current
    const uid = userIdRef.current
    await Promise.all([
      sb.from('gifts').insert({ sender_id: uid, receiver_id: id, gift_type: gift.id, cost_sparks: gift.cost }),
      sb.rpc('add_sparks', { user_id: uid, amount: -gift.cost }),
      sb.from('messages').insert({ sender_id: uid, receiver_id: id, call_id: callData.callId, content }),
    ])
  }

  const initCall = async () => {
    const supabase = createClient()
    sbRef.current = supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    userIdRef.current = user.id

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

    // Listen for the call ending or being declined, and for in-call chat messages
    channelRef.current = supabase
      .channel(`call-${data.callId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'calls',
        filter: `id=eq.${data.callId}`,
      }, (payload) => {
        if (endedRef.current) return
        if (payload.new.status === 'ended') {
          endedRef.current = true
          clearInterval(timerRef.current)
          fetch('/api/calls/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: data.callId }) }).then(r => r.json()).catch(() => null).then(out => { const sec = out?.success ? out.seconds : secondsRef.current; const sp = out?.success ? out.sparks : spentRef.current; router.push(`/review/${id}?duration=${sec}&cost=${sp}&isHost=false&callId=${data.callId}`) })
        } else if (payload.new.status === 'rejected') {
          endedRef.current = true
          clearInterval(timerRef.current)
          setEnding(true)
          alert(`${host?.name?.split(' ')[0] || 'The host'} declined the call.`)
          router.back()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `call_id=eq.${data.callId}`,
      }, (payload) => {
        const m = payload.new
        if (m.sender_id === user.id) return
        addMessage(m.content, false, m.id)
        if (!giftOpenRef.current) setChatVisible(true)
      })
      .subscribe()
  }

  useEffect(() => {
    initCall()
    const hintTimer = setTimeout(() => setShowHint(false), 4000)
    return () => {
      clearTimeout(hintTimer)
      clearInterval(timerRef.current)
      if (sbRef.current && channelRef.current) sbRef.current.removeChannel(channelRef.current)
    }
  }, [id])

  // End the call automatically when the balance reaches zero
  useEffect(() => {
    if (!connected || ending || endedRef.current) return
    if (rate > 0 && remaining <= 0) endCall()
  }, [seconds, connected])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatVisible])

  return (
    <div style={{ height: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', userSelect: 'none' }}>

      {/* Video area */}
      <div onClick={() => { if (!giftOpen) setChatVisible(v => !v) }}
        style={{ flex: 1, position: 'relative', cursor: 'pointer' }}>

        {callData && (
          <CallVideo
            roomUrl={callData.roomUrl}
            userName={profile?.name}
            active={!ending}
            muted={muted}
            camOff={camOff}
            remoteUser={host}
            pipTop={116}
            onRemoteJoined={startTimer}
          />
        )}

        {/* Loading state */}
        {!callData && (
          <div style={{ position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 45% 45%, rgba(214,63,110,0.4), #000)',
            gap: 16 }}>
            <Avatar user={host} size={120} />
            <div style={{ color: '#fff', fontSize: 20, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>
              {host?.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Connecting…</div>
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

        {/* Host pill */}
        {callData && (
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 5, display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
            padding: '6px 14px 6px 6px', borderRadius: 99,
            border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none' }}>
            <Avatar user={host} size={34} />
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{host?.name?.split(' ')[0]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--gold)' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{connected ? 'Live' : 'Calling…'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Last gift toast */}
        {lastGift && (
          <div style={{ position: 'absolute', top: 76, left: 20, zIndex: 5,
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
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 5,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)',
          padding: '10px 16px', borderRadius: 14,
          border: '1px solid rgba(201,164,106,0.3)', textAlign: 'right',
          pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: '#fff' }}>{fmt(seconds)}</div>
          <div style={{ color: 'var(--gold)', fontSize: 13 }}>⚡ {spent} spent</div>
          <div style={{ color: 'var(--sub)', fontSize: 10 }}>Balance: {Math.max(0, remaining)}</div>
        </div>

        {/* Chat hint */}
        {showHint && !chatVisible && (
          <div style={{ position: 'absolute', bottom: 80, left: '50%', zIndex: 5,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.6)', padding: '6px 16px',
            borderRadius: 99, fontSize: 11, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            💬 Tap screen to chat
          </div>
        )}
      </div>

      {/* Low credits warning */}
      {lowCredits && (
        <div style={{ position: 'absolute', top: '42%', left: 20, right: 20, zIndex: 120,
          background: 'rgba(214,63,110,0.88)', borderRadius: 12, padding: 10, textAlign: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>
          ⚠️ Low credits — call will end soon
        </div>
      )}

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
              style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            {chatMessages.map(m => {
              const g = parseGift(m.text)
              return (
                <div key={m.id} style={{ display: 'flex',
                  justifyContent: m.fromMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  <div style={{ maxWidth: '75%', padding: g ? '8px 14px' : '9px 13px',
                    borderRadius: m.fromMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.fromMe ? 'linear-gradient(135deg, var(--rose), #A02050)' : 'var(--card)',
                    fontSize: 13, color: '#fff', textAlign: g ? 'center' : 'left', wordBreak: 'break-word' }}>
                    {g ? (
                      <>
                        <div style={{ fontSize: 32 }}>{giftEmoji(g.id)}</div>
                        <div style={{ fontSize: 11, color: 'var(--gold)' }}>{g.name} · ⚡{g.cost}</div>
                      </>
                    ) : m.text}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
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
          backdropFilter: 'blur(28px)', maxHeight: '55vh', overflowY: 'auto',
          borderTop: '1px solid rgba(201,164,106,0.3)', padding: '20px 18px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700 }}>
                Send a <em style={{ color: 'var(--gold)' }}>Gift</em>
              </div>
              <div style={{ color: 'var(--sub)', fontSize: 12, marginTop: 2 }}>
                Balance: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>⚡ {Math.max(0, remaining)}</span>
              </div>
            </div>
            <button onClick={() => setGiftOpen(false)}
              style={{ background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--sub)', borderRadius: 99, width: 32, height: 32,
                cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          {TIER_ORDER.map(tier => (
            <div key={tier} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{TIER_LABELS[tier]}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 8 }}>
                {GIFTS.filter(g => g.tier === tier).sort((a, b) => a.cost - b.cost).map(g => {
                  const can = remaining >= g.cost
                  return (
                    <button key={g.id} onClick={() => can && sendGift(g)} disabled={!can}
                      style={{ padding: '10px 4px', borderRadius: 14,
                        border: '1px solid var(--border)',
                        background: can ? 'var(--card)' : 'rgba(19,14,34,0.5)',
                        cursor: can ? 'pointer' : 'not-allowed',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3, opacity: can ? 1 : 0.4 }}>
                      <span style={{ fontSize: 26 }}>{g.emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{g.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--gold)' }}>⚡ {fmtCost(g.cost)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '12px 16px 20px', flexShrink: 0, zIndex: 95,
        background: 'linear-gradient(to top, #05030c, rgba(5,3,12,0.92))',
        display: 'flex', justifyContent: 'center' }}>
        <CallControls
          muted={muted} camOff={camOff}
          onToggleMute={() => setMuted(m => !m)}
          onToggleCam={() => setCamOff(c => !c)}
          showChat chatActive={chatVisible}
          onToggleChat={() => { setChatVisible(v => !v); setGiftOpen(false) }}
          showGift giftActive={giftOpen}
          onToggleGift={() => { setGiftOpen(v => !v); setChatVisible(false) }}
          onEnd={hangUp} ending={ending} />
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
