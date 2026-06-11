'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Mic, MicOff, Video, VideoOff, Gift, PhoneOff, Send } from 'lucide-react'
import { GiftIcon, GIFTS, TIER_LABELS } from '@/components/GiftIcons'

export default function CallPage() {
  const router = useRouter()
  const { id } = useParams()
  const [host, setHost]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [callData, setCallData]     = useState(null)
  const [seconds, setSeconds]       = useState(0)
  const [muted, setMuted]           = useState(false)
  const [camOff, setCamOff]         = useState(false)
  const [giftOpen, setGiftOpen]     = useState(false)
  const [chatInput, setChatInput]   = useState('')
  const [messages, setMessages]     = useState([])
  const [chatVisible, setChatVisible] = useState(true)
  const [flyingGift, setFlyingGift] = useState(null)
  const [ending, setEnding]         = useState(false)
  const [credits, setCredits]       = useState(0)
  const containerRef  = useRef(null)
  const timerRef      = useRef(null)
  const callRef       = useRef(null)
  const initialized   = useRef(false)
  const inputRef      = useRef(null)
  const msgIdRef      = useRef(0)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    initCall()
    return () => {
      clearInterval(timerRef.current)
      if (callRef.current) { callRef.current.destroy(); callRef.current = null }
      initialized.current = false
    }
  }, [id])

  const initCall = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: h }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', id).single(),
    ])
    setProfile(prof); setHost(h); setCredits(prof.credits)

    const res = await fetch('/api/calls/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: id }),
    })
    const data = await res.json()
    if (!data.roomUrl) { router.back(); return }
    setCallData(data)

    const { default: DailyIframe } = await import('@daily-co/daily-js')
    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' },
      showLeaveButton: false,
      showFullscreenButton: false,
    })
    callRef.current = frame
    await frame.join({ url: data.roomUrl })
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  const getRate = () => {
    if (!profile || !host) return 0
    const d = profile.premium === 'platinum' ? 0.8 : profile.premium === 'gold' ? 0.9 : 1
    return Math.round(host.rate * d)
  }
  const getSparksSpent = () => Math.floor((seconds / 60) * getRate())

  const endCall = async () => {
    if (ending) return
    setEnding(true)
    clearInterval(timerRef.current)
    if (callRef.current) callRef.current.destroy()
    const sparksSpent = getSparksSpent()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await fetch('/api/calls/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callData?.callId,
          roomName: callData?.roomName,
          durationSeconds: seconds,
          sparksSpent,
          callerId: user?.id,
        }),
      })
    } catch(e) { console.error(e) }
    router.push(`/review/${id}?duration=${seconds}&cost=${sparksSpent}`)
  }

  // Add a floating message that auto-removes after 6s
  const addMessage = (text, fromMe) => {
    const msgId = ++msgIdRef.current
    setMessages(prev => [...prev.slice(-5), { id: msgId, text, fromMe, age: 0 }])
    // Mark as fading after 4s, remove after 6s
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, fading: true } : m))
    }, 4000)
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== msgId))
    }, 6000)
  }

  const sendMessage = () => {
    if (!chatInput.trim()) return
    addMessage(chatInput.trim(), true)
    setChatInput('')
  }

  const sendGift = async (gift) => {
    if (credits < gift.cost) return
    setCredits(c => c - gift.cost)
    setFlyingGift(gift)
    setGiftOpen(false)
    addMessage(`✨ Sent ${gift.name}`, true)
    setTimeout(() => setFlyingGift(null), 2000)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('gifts').insert({
      sender_id: user.id, receiver_id: id,
      call_id: callData?.callId,
      gift_type: gift.id, cost_sparks: gift.cost,
    })
    await supabase.rpc('add_sparks', { user_id: user.id, amount: -gift.cost })
  }

  const handleVideoTap = () => {
    if (giftOpen) { setGiftOpen(false); return }
    setChatVisible(v => !v)
  }

  const fmtCost = n => n >= 1000 ? `${n / 1000}K` : n

  return (
    <div style={{
      height: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      userSelect: 'none',
    }}>

      {/* ── VIDEO CONTAINER ── */}
      <div
        ref={containerRef}
        onClick={handleVideoTap}
        style={{
          flex: 1, position: 'relative', cursor: 'pointer',
          background: 'radial-gradient(ellipse at 45% 40%, rgba(214,63,110,0.25), #000)',
          minHeight: 0,
        }}
      >
        {/* Loading state */}
        {!callData && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'linear-gradient(145deg, #D63F6E, rgba(214,63,110,0.4))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: '#fff',
              fontFamily: "'Cormorant Garamond', serif",
              boxShadow: '0 0 40px rgba(214,63,110,0.35)',
            }}>
              {host?.name?.charAt(0)}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Connecting…</span>
          </div>
        )}

        {/* ── TOP GRADIENT ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 90,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
          pointerEvents: 'none',
        }}/>

        {/* ── HOST INFO (top-left) ── */}
        <div style={{
          position: 'absolute', top: 14, left: 14,
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(145deg, #D63F6E, rgba(214,63,110,0.5))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
            fontFamily: "'Cormorant Garamond', serif",
            border: '1.5px solid rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}>
            {host?.name?.charAt(0)}
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600,
              textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              {host?.name?.split(' ')[0]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3DD68C' }}/>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Live</span>
            </div>
          </div>
        </div>

        {/* ── TIMER (top-right) ── */}
        <div style={{
          position: 'absolute', top: 14, right: 14,
          textAlign: 'right', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'monospace', fontSize: 22,
            fontWeight: 700, color: '#fff',
            textShadow: '0 1px 8px rgba(0,0,0,0.9)',
            letterSpacing: 1,
          }}>
            {fmt(seconds)}
          </div>
          <div style={{ color: '#C9A46A', fontSize: 10, marginTop: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            ⚡ {getSparksSpent()}
          </div>
        </div>

        {/* ── FLYING GIFT ── */}
        {flyingGift && (
          <div style={{
            position: 'absolute', bottom: '22%', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50, pointerEvents: 'none',
            animation: 'giftFly 2s ease forwards',
          }}>
            <GiftIcon id={flyingGift.id} size={72}/>
          </div>
        )}

        {/* ── FLOATING MESSAGES (left side, transparent) ── */}
        {chatVisible && (
          <div style={{
            position: 'absolute', left: 0, bottom: 12,
            width: '68%', padding: '0 12px',
            display: 'flex', flexDirection: 'column', gap: 5,
            pointerEvents: 'none',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 5,
                flexDirection: msg.fromMe ? 'row-reverse' : 'row',
                animation: 'msgSlide 0.3s ease',
                opacity: msg.fading ? 0 : 1,
                transition: 'opacity 2s ease',
              }}>
                {!msg.fromMe && (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(214,63,110,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 700, color: '#fff',
                    flexShrink: 0,
                    fontFamily: "'Cormorant Garamond', serif",
                  }}>
                    {host?.name?.charAt(0)}
                  </div>
                )}
                <div style={{
                  padding: '6px 11px',
                  borderRadius: msg.fromMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: 'rgba(0,0,0,0.22)',
                  backdropFilter: 'blur(4px)',
                  borderLeft: msg.fromMe ? 'none' : '2px solid rgba(214,63,110,0.7)',
                  borderRight: msg.fromMe ? '2px solid rgba(201,164,106,0.7)' : 'none',
                  color: '#fff',
                  fontSize: 12,
                  lineHeight: 1.4,
                  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAP HINT when chat hidden ── */}
        {!chatVisible && !giftOpen && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.3)', fontSize: 10,
            pointerEvents: 'none', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            tap to show chat
          </div>
        )}
      </div>

      {/* ── MESSAGE INPUT BAR (always below video) ── */}
      <div style={{
        background: 'rgba(6,4,14,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 9,
        flexShrink: 0, zIndex: 90,
      }}>
        <input
          ref={inputRef}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={host ? `Message ${host.name.split(' ')[0]}…` : 'Message…'}
          style={{
            flex: 1, padding: '9px 14px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 22, color: '#fff', fontSize: 13,
            outline: 'none', fontFamily: "'Outfit', sans-serif",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!chatInput.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: chatInput.trim()
              ? 'linear-gradient(135deg, #D63F6E, #A02050)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff', cursor: chatInput.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          <Send size={15}/>
        </button>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{
        background: 'rgba(6,4,14,0.92)',
        backdropFilter: 'blur(20px)',
        padding: '10px 16px 28px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
        flexShrink: 0, zIndex: 90,
      }}>
        {/* Single frosted pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 99, padding: '8px 16px',
        }}>
          {/* Mic */}
          <button
            onClick={() => { setMuted(!muted); callRef.current?.setLocalAudio(muted) }}
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none',
              background: muted ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: muted ? '#fff' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {muted ? <MicOff size={19}/> : <Mic size={19}/>}
          </button>

          {/* Camera */}
          <button
            onClick={() => { setCamOff(!camOff); callRef.current?.setLocalVideo(camOff) }}
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none',
              background: camOff ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: camOff ? '#fff' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {camOff ? <VideoOff size={19}/> : <Video size={19}/>}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', margin: '0 3px' }}/>

          {/* Gift */}
          <button
            onClick={() => setGiftOpen(v => !v)}
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none',
              background: giftOpen ? 'rgba(201,164,106,0.25)' : 'transparent',
              color: giftOpen ? '#C9A46A' : 'rgba(201,164,106,0.8)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: giftOpen ? '0 0 14px rgba(201,164,106,0.35)' : 'none',
            }}
          >
            <Gift size={19}/>
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', margin: '0 3px' }}/>

          {/* End call */}
          <button
            onClick={endCall}
            disabled={ending}
            style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none',
              background: ending ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #D63F6E, #A02050)',
              color: '#fff', cursor: ending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: ending ? 'none' : '0 0 22px rgba(214,63,110,0.5)',
              transition: 'all 0.3s',
              transform: ending ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            <PhoneOff size={22}/>
          </button>
        </div>

        {/* Balance under pill */}
        <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: 0.3 }}>
          ⚡ {credits.toLocaleString()} balance
        </div>
      </div>

      {/* ── GIFT PANEL (slides up) ── */}
      {giftOpen && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 200,
          background: 'rgba(8,5,18,0.97)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(201,164,106,0.2)',
          padding: '18px 16px 32px',
          animation: 'slideUp 0.28s ease',
          maxHeight: '72vh', overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16,
          }}>
            <div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20, fontWeight: 700, color: '#fff',
              }}>
                Send a <em style={{ color: '#C9A46A' }}>Gift</em>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                Balance: <span style={{ color: '#C9A46A', fontWeight: 600 }}>⚡ {credits.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setGiftOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>

          {/* Gifts by tier */}
          {Object.entries(
            GIFTS.reduce((acc, g) => {
              if (!acc[g.tier]) acc[g.tier] = []
              acc[g.tier].push(g)
              return acc
            }, {})
          ).map(([tier, tierGifts]) => (
            <div key={tier} style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 2,
                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                marginBottom: 9, fontFamily: "'Outfit', sans-serif",
              }}>
                {TIER_LABELS[tier]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {tierGifts.map(g => {
                  const canAfford = credits >= g.cost
                  return (
                    <button
                      key={g.id}
                      onClick={() => canAfford && sendGift(g)}
                      style={{
                        padding: '10px 4px', borderRadius: 13,
                        border: `1px solid ${canAfford ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                        background: canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 4,
                        opacity: canAfford ? 1 : 0.35,
                        transition: 'all 0.15s',
                      }}
                    >
                      <GiftIcon id={g.id} size={34}/>
                      <span style={{ fontSize: 9, fontWeight: 600, color: '#fff',
                        textAlign: 'center', lineHeight: 1.2 }}>
                        {g.name}
                      </span>
                      <span style={{ fontSize: 9, color: '#C9A46A' }}>
                        ⚡{fmtCost(g.cost)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Top up */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 14,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10,
              textAlign: 'center', marginBottom: 9 }}>
              Need more Sparks?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { id: 'starter',   sparks: 200,  price: '$2.99' },
                { id: 'popular',   sparks: 600,  price: '$7.99' },
                { id: 'bestvalue', sparks: 2000, price: '$19.99' },
              ].map(pack => (
                <button
                  key={pack.id}
                  onClick={async () => {
                    const r = await fetch('/api/payments/create-session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ packId: pack.id }),
                    })
                    const { url } = await r.json()
                    if (url) window.open(url, '_blank')
                  }}
                  style={{
                    padding: '10px 6px', borderRadius: 11,
                    border: '1px solid rgba(201,164,106,0.2)',
                    background: 'rgba(201,164,106,0.07)',
                    cursor: 'pointer', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A46A' }}>
                    ⚡ {pack.sparks}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                    {pack.price}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)',
              textAlign: 'center', marginTop: 8 }}>
              Opens in new tab · call stays active
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes giftFly {
          0%   { transform: translateX(-50%) scale(1); opacity: 1; }
          55%  { transform: translateX(-50%) translateY(-45vh) scale(2.2); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-70vh) scale(1.6); opacity: 0; }
        }
        @keyframes msgSlide {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        input::placeholder { color: rgba(255,255,255,0.28); }
        *:focus { outline: none; }
      `}</style>
    </div>
  )
}