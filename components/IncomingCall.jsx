'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function IncomingCall() {
  const [call, setCall]       = useState(null)
  const [caller, setCaller]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const [active, setActive]   = useState(false)
  const timerRef   = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channelRef.current = supabase
        .channel(`incoming-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'calls',
          filter: `host_id=eq.${user.id}`,
        }, async (payload) => {
          if (payload.new.status !== 'pending') return
          const { data: callerProfile } = await supabase
            .from('profiles').select('*').eq('id', payload.new.caller_id).single()
          setCaller(callerProfile)
          setCall(payload.new)
          setSeconds(30)
          setActive(true)
        })
        .subscribe()
    }
    init()
    return () => { channelRef.current?.unsubscribe(); clearInterval(timerRef.current) }
  }, [])

  // Countdown
  useEffect(() => {
    if (!active) return
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current); dismiss(); handleReject(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [active])

  const dismiss = () => { setActive(false); setCall(null); setCaller(null); setLoading(false) }

  const handleAccept = async () => {
    if (!call) return
    setLoading(true)
    clearInterval(timerRef.current)
    // Update status to accepted
    await fetch('/api/calls/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: call.id }),
    })
    // Navigate to embedded call page in the web app
    window.location.href = `/call/${call.id}`
    dismiss()
  }

  const handleReject = async () => {
    if (!call) return
    clearInterval(timerRef.current)
    await fetch('/api/calls/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: call.id }),
    })
    dismiss()
  }

  if (!active || !call) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#130E22', borderRadius: 24,
        border: '1px solid rgba(214,63,110,0.3)',
        padding: '40px 32px', maxWidth: 360, width: '90%',
        textAlign: 'center', boxShadow: '0 0 60px rgba(214,63,110,0.2)',
      }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
          background: 'rgba(214,63,110,0.2)',
          border: '2px solid rgba(214,63,110,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: '#D63F6E', fontWeight: 700,
          animation: 'pulse 1.5s infinite',
        }}>
          {caller?.name?.charAt(0) || '?'}
        </div>

        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12,
          letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
          Incoming Call
        </div>
        <div style={{ color:'#EDE8F5', fontSize:22, fontWeight:700, marginBottom:4 }}>
          {caller?.name || 'Someone'}
        </div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:12 }}>
          wants to connect with you
        </div>

        <div style={{
          background:'rgba(201,164,106,0.1)', borderRadius:99,
          padding:'6px 16px', display:'inline-block', marginBottom:20,
          border:'1px solid rgba(201,164,106,0.3)',
        }}>
          <span style={{ color:'#C9A46A', fontSize:13, fontWeight:600 }}>
            ⚡ You earn {caller?.rate || 0} sparks/min
          </span>
        </div>

        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginBottom:24 }}>
          Auto-declining in {seconds}s
        </div>

        <div style={{ display:'flex', gap:12 }}>
          <button onClick={handleReject} disabled={loading} style={{
            flex:1, padding:'14px', borderRadius:12, border:'none',
            background:'rgba(255,255,255,0.08)', color:'#EDE8F5',
            fontSize:15, fontWeight:600, cursor:'pointer',
          }}>Decline</button>
          <button onClick={handleAccept} disabled={loading} style={{
            flex:1, padding:'14px', borderRadius:12, border:'none',
            background:'linear-gradient(135deg,#D63F6E,#A02050)',
            color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer',
            boxShadow:'0 0 20px rgba(214,63,110,0.4)',
          }}>{loading ? 'Joining…' : 'Accept'}</button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(214,63,110,0.4)}
          50%{box-shadow:0 0 0 16px rgba(214,63,110,0)}
        }
      `}</style>
    </div>
  )
}
