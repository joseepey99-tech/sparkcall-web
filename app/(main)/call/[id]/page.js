'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CallVideo from '@/components/CallVideo'
import { GIFTS, TIER_ORDER, TIER_LABELS, giftEmoji, parseGift, fmtCost } from '@/lib/gifts'

const C = {
  bg: '#06040E', card: '#130E22', border: '#201840',
  rose: '#D63F6E', gold: '#C9A46A', white: '#EDE8F5',
  muted: '#8178A0', success: '#3DD68C',
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function Avatar({ user, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'rgba(214,63,110,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.4),
      border: '1.5px solid rgba(255,255,255,0.3)' }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (user?.name?.charAt(0) || '')}
    </div>
  )
}

export default function WebCallPage() {
  const { id } = useParams()
  const router = useRouter()

  const [call, setCall] = useState(null)
  const [caller, setCaller] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [ending, setEnding] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showUI, setShowUI] = useState(true)
  const [giftOpen, setGiftOpen] = useState(false)
  const [credits, setCredits] = useState(0)
  const [flyingGift, setFlyingGift] = useState(null)
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)

  const timerRef = useRef(null)
  const channelRef = useRef(null)
  const uiTimerRef = useRef(null)
  const chatRef = useRef(null)
  const sbRef = useRef(null)
  const userIdRef = useRef(null)
  const secondsRef = useRef(0)
  const endedRef = useRef(false)
  secondsRef.current = seconds

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      sbRef.current = supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      userIdRef.current = user.id

      const [{ data: callData }, { data: me }] = await Promise.all([
        supabase.from('calls').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      if (!callData) { router.push('/'); return }
      setCall(callData)
      setMyProfile(me)
      setCredits(me?.credits ?? 0)

      const { data: callerData } = await supabase
        .from('profiles').select('*').eq('id', callData.caller_id).single()
      setCaller(callerData)

      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

      channelRef.current = supabase
        .channel(`call-${id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${id}`,
        }, (payload) => {
          if (payload.new.status === 'ended' && !endedRef.current) {
            endedRef.current = true
            clearInterval(timerRef.current)
            const s = secondsRef.current
            const spent = Math.floor(s / 60 * (callData.rate || 10))
            router.push(`/review/${callData.caller_id}?duration=${s}&cost=${spent}&isHost=true&callId=${id}`)
          }
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages', filter: `call_id=eq.${id}`,
        }, (payload) => {
          const msg = payload.new
          if (msg.sender_id === userIdRef.current) return
          addMessage(msg.content, false, msg.id)
        })
        .subscribe()
    }
    init()
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(uiTimerRef.current)
      if (sbRef.current && channelRef.current) sbRef.current.removeChannel(channelRef.current)
    }
  }, [id])

  // Auto-hide UI after 4s
  const showUIWithTimer = () => {
    setShowUI(true)
    clearTimeout(uiTimerRef.current)
    uiTimerRef.current = setTimeout(() => setShowUI(false), 4000)
  }

  const addMessage = (text, fromMe, msgId) => {
    const mid = msgId || String(Date.now() + Math.random())
    setMessages(prev => [...prev.slice(-20), { id: mid, text, fromMe }])
    if (!fromMe) setShowUI(true)
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 100)
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !userIdRef.current) return
    setInput('')
    addMessage(text, true)
    await sbRef.current.from('messages').insert({
      call_id: id, sender_id: userIdRef.current,
      receiver_id: call?.caller_id, content: text,
    })
  }

  const sendGift = async (gift) => {
    if (credits < gift.cost || !call) return
    setCredits(c => c - gift.cost)
    setGiftOpen(false)
    setFlyingGift(gift)
    setTimeout(() => setFlyingGift(null), 2000)
    const content = JSON.stringify({ type: 'gift', id: gift.id, name: gift.name, cost: gift.cost })
    addMessage(content, true)
    const sb = sbRef.current
    const uid = userIdRef.current
    await Promise.all([
      sb.from('gifts').insert({ sender_id: uid, receiver_id: call.caller_id, gift_type: gift.id, cost_sparks: gift.cost }),
      sb.rpc('add_sparks', { user_id: uid, amount: -gift.cost }),
      sb.from('messages').insert({ call_id: id, sender_id: uid, receiver_id: call.caller_id, content }),
    ])
  }

  const endCall = async () => {
    if (ending || endedRef.current) return
    endedRef.current = true
    setEnding(true)
    clearInterval(timerRef.current)
    const spent = Math.floor(seconds / 60 * (call.rate || 10))
    await fetch('/api/calls/end', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: id, durationSeconds: seconds, sparksSpent: spent }),
    })
    router.push(`/review/${call.caller_id}?duration=${seconds}&cost=${spent}&isHost=true&callId=${id}`)
  }

  if (!call) return (
    <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontFamily: 'sans-serif' }}>
      Connecting...
    </div>
  )

  const roundBtn = (on) => ({
    width: 46, height: 46, borderRadius: '50%', border: 'none',
    background: on ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
    color: '#fff', fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', userSelect: 'none' }}
      onClick={() => { if (!giftOpen) showUIWithTimer() }}>

      {/* Video */}
      <CallVideo
        roomUrl={call.room_url}
        userName={myProfile?.name}
        active={!ending}
        muted={muted}
        camOff={camOff}
        remoteUser={caller}
        pipTop={84}
      />

      {/* Flying gift */}
      {flyingGift && (
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 72, zIndex: 50, pointerEvents: 'none',
          animation: 'flyup 2s ease-out forwards' }}>
          {flyingGift.emoji}
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
        padding: '16px 20px 12px',
        background: 'linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none',
        opacity: showUI ? 1 : 0, transition: 'opacity 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={caller} size={36} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{caller?.name?.split(' ')[0]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.success }} />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Live</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontSize: 20, fontFamily: 'monospace', fontWeight: 700 }}>{fmt(seconds)}</div>
          <div style={{ color: C.gold, fontSize: 10, marginTop: 2 }}>⚡ {Math.floor(seconds / 60 * (call.rate || 10))} earned</div>
        </div>
      </div>

      {/* Chat panel */}
      {showUI && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, zIndex: 20,
          maxHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
          <div ref={chatRef} style={{ overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.map(msg => {
              const gift = parseGift(msg.text)
              return (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {msg.fromMe ? (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(201,164,106,0.7)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>Me</div>
                  ) : (
                    <Avatar user={caller} size={22} />
                  )}
                  <div style={{ padding: gift ? '8px 12px' : '7px 12px', borderRadius: 18,
                    borderBottomLeftRadius: 4,
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 13, maxWidth: '70%', wordBreak: 'break-word',
                    display: 'flex', flexDirection: gift ? 'column' : 'row',
                    alignItems: gift ? 'center' : 'flex-start', gap: 4 }}>
                    {gift ? (
                      <>
                        <span style={{ fontSize: 32 }}>{giftEmoji(gift.id)}</span>
                        <span style={{ fontSize: 11, color: C.gold }}>{gift.name} · ⚡{gift.cost}</span>
                      </>
                    ) : msg.text}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(6,4,14,0.85)', backdropFilter: 'blur(12px)',
        padding: '12px 16px 22px', display: 'flex', flexDirection: 'column', gap: 12,
        opacity: showUI ? 1 : 0, transition: 'opacity 0.4s ease',
        pointerEvents: showUI ? 'auto' : 'none',
      }} onClick={e => e.stopPropagation()}>

        {/* Chat input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setGiftOpen(v => !v)} style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: giftOpen ? 'rgba(201,164,106,0.2)' : 'rgba(255,255,255,0.08)',
            cursor: 'pointer', fontSize: 18,
          }}>🎁</button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${caller?.name?.split(' ')[0] || ''}…`}
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 24, padding: '10px 16px', color: '#fff', fontSize: 13, outline: 'none' }} />
          <button onClick={sendMessage} style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: input.trim() ? C.rose : 'rgba(255,255,255,0.1)',
            cursor: 'pointer', color: '#fff', fontSize: 16,
          }}>➤</button>
        </div>

        {/* Call controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, minWidth: 56, textAlign: 'right' }}>⚡{credits.toLocaleString()}</span>
          <button onClick={() => setMuted(m => !m)} style={roundBtn(muted)}>{muted ? '🔇' : '🎤'}</button>
          <button onClick={() => setCamOff(c => !c)} style={roundBtn(camOff)}>{camOff ? '📷' : '📹'}</button>
          <button onClick={endCall} disabled={ending} style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg,#D63F6E,#A02050)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(214,63,110,0.5)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.84 19.79 19.79 0 0 1 1.2 1.2 2 2 0 0 1 3.18 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 7.83" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </button>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, minWidth: 56 }}>End Call</span>
        </div>
      </div>

      {/* Gift panel */}
      {giftOpen && (
        <div style={{ position: 'absolute', bottom: 150, left: 0, right: 0, zIndex: 40,
          background: 'rgba(8,5,18,0.97)', borderTop: '1px solid rgba(201,164,106,0.2)',
          padding: 18, maxHeight: '50vh', overflowY: 'auto',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 18 }}>Send a Gift</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                Balance: <span style={{ color: C.gold }}>⚡{credits.toLocaleString()}</span>
              </div>
            </div>
            <button onClick={() => setGiftOpen(false)} style={{ background: 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>×</button>
          </div>
          {TIER_ORDER.map(tier => (
            <div key={tier} style={{ marginBottom: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2,
                textTransform: 'uppercase', marginBottom: 8 }}>{TIER_LABELS[tier]}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                {GIFTS.filter(g => g.tier === tier).sort((a, b) => a.cost - b.cost).map(g => {
                  const can = credits >= g.cost
                  return (
                    <button key={g.id} onClick={() => can && sendGift(g)}
                      style={{ display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                        padding: '10px 4px', cursor: can ? 'pointer' : 'not-allowed',
                        opacity: can ? 1 : 0.3 }}>
                      <span style={{ fontSize: 26 }}>{g.emoji}</span>
                      <span style={{ color: C.white, fontSize: 9, textAlign: 'center' }}>{g.name}</span>
                      <span style={{ color: C.gold, fontSize: 9, fontWeight: 700 }}>⚡{fmtCost(g.cost)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes flyup { 0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-120px) scale(1.5)} }
      `}</style>
    </div>
  )
}