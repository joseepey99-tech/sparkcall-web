'use client'
import { useState, useEffect, useRef } from 'react'
import { VideoOff } from 'lucide-react'

const PIP_W = 168
const PIP_H = 126

function Avatar({ user, size }) {
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

export default function CallVideo({
  roomUrl, userName, active = true, muted = false, camOff = false,
  remoteUser, pipTop = 80, onJoined, onRemoteJoined, onRemoteLeft,
}) {
  const rootRef = useRef(null)
  const remoteRef = useRef(null)
  const remoteBgRef = useRef(null)
  const localRef = useRef(null)
  const callRef = useRef(null)
  const attached = useRef({ remote: null, local: null })
  const prevRemote = useRef(false)
  const handlers = useRef({})
  handlers.current = { onJoined, onRemoteJoined, onRemoteLeft }

  const [joined, setJoined] = useState(false)
  const [remotePresent, setRemotePresent] = useState(false)
  const [remoteVideo, setRemoteVideo] = useState(false)
  const [localVideo, setLocalVideo] = useState(false)
  const [error, setError] = useState(null)
  const [pos, setPos] = useState({ right: 16, top: pipTop })
  const drag = useRef(null)

  useEffect(() => {
    if (!roomUrl || !active) return
    let cancelled = false
    let call = null
    let poll = null
    prevRemote.current = false
    attached.current = { remote: null, local: null }

    const sync = () => {
      const c = callRef.current
      if (!c) return
      let rPresent = false
      let rTrack = null
      let lTrack = null
      Object.values(c.participants()).forEach(p => {
        const v = p.tracks && p.tracks.video
        const track = v && v.state !== 'off' && v.state !== 'blocked' ? (v.persistentTrack || v.track) : null
        if (p.local) { lTrack = track || null } else { rPresent = true; rTrack = track || null }
      })

      const rId = rTrack ? rTrack.id : null
      if (attached.current.remote !== rId) {
        attached.current.remote = rId
        const stream = rTrack ? new MediaStream([rTrack]) : null
        if (remoteRef.current) remoteRef.current.srcObject = stream
        if (remoteBgRef.current) remoteBgRef.current.srcObject = stream
      }
      const lId = lTrack ? lTrack.id : null
      if (attached.current.local !== lId) {
        attached.current.local = lId
        if (localRef.current) localRef.current.srcObject = lTrack ? new MediaStream([lTrack]) : null
      }

      setRemoteVideo(!!rTrack)
      setLocalVideo(!!lTrack)
      if (rPresent !== prevRemote.current) {
        prevRemote.current = rPresent
        setRemotePresent(rPresent)
        if (rPresent) { handlers.current.onRemoteJoined && handlers.current.onRemoteJoined() }
        else { handlers.current.onRemoteLeft && handlers.current.onRemoteLeft() }
      }
    }

    ;(async () => {
      try {
        const { default: Daily } = await import('@daily-co/daily-js')
        if (cancelled) return
        if (typeof Daily.getCallInstance === 'function') {
          const old = Daily.getCallInstance()
          if (old) { try { await old.destroy() } catch (e) {} }
          if (cancelled) return
        }
        call = Daily.createCallObject({ audioSource: true, videoSource: true })
        callRef.current = call
        ;['joined-meeting', 'participant-joined', 'participant-updated', 'participant-left', 'track-started', 'track-stopped']
          .forEach(ev => call.on(ev, sync))
        call.on('camera-error', () => setError('Camera or microphone is blocked. Allow access in your browser, then reload.'))
        call.on('error', () => setError('Connection problem. Please try again.'))
        poll = setInterval(sync, 1000)
        await call.join({ url: roomUrl, userName: userName || undefined })
        if (cancelled) return
        setJoined(true)
        if (handlers.current.onJoined) handlers.current.onJoined()
        sync()
      } catch (e) {
        if (!cancelled) setError('Could not join the call.')
      }
    })()

    return () => {
      cancelled = true
      clearInterval(poll)
      const c = call
      callRef.current = null
      if (c) c.leave().catch(() => {}).then(() => { try { c.destroy() } catch (e) {} })
      ;[remoteRef, remoteBgRef, localRef].forEach(r => { if (r.current) r.current.srcObject = null })
      attached.current = { remote: null, local: null }
      setJoined(false)
      setRemotePresent(false)
      setRemoteVideo(false)
      setLocalVideo(false)
    }
  }, [roomUrl, active])

  useEffect(() => { if (joined && callRef.current) callRef.current.setLocalAudio(!muted) }, [muted, joined])
  useEffect(() => { if (joined && callRef.current) callRef.current.setLocalVideo(!camOff) }, [camOff, joined])

  const onPipDown = e => {
    e.stopPropagation()
    drag.current = { sx: e.clientX, sy: e.clientY, r: pos.right, t: pos.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPipMove = e => {
    const d = drag.current
    if (!d || !rootRef.current) return
    const box = rootRef.current.getBoundingClientRect()
    const right = Math.min(Math.max(0, d.r - (e.clientX - d.sx)), Math.max(0, box.width - PIP_W))
    const top = Math.min(Math.max(0, d.t + (e.clientY - d.sy)), Math.max(0, box.height - PIP_H))
    setPos({ right, top })
  }
  const onPipUp = () => { drag.current = null }

  const first = remoteUser?.name?.split(' ')[0] || 'them'
  const status = error ? error
    : !joined ? 'Connecting…'
    : !remotePresent ? `Waiting for ${first}…`
    : 'Camera off'

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, background: '#05030c', overflow: 'hidden', zIndex: 0 }}>
      <video ref={remoteBgRef} autoPlay playsInline muted
        style={{ position: 'absolute', inset: '-8%', width: '116%', height: '116%', objectFit: 'cover',
          filter: 'blur(36px) brightness(0.45)', opacity: remoteVideo ? 1 : 0 }} />
      <video ref={remoteRef} autoPlay playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
          opacity: remoteVideo ? 1 : 0 }} />

      {!remoteVideo && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(214,63,110,0.25), #05030c 70%)' }}>
          <Avatar user={remoteUser} size={132} />
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>
            {remoteUser?.name}
          </div>
          <div style={{ color: error ? '#ff8aa8' : 'rgba(255,255,255,0.65)', fontSize: 13,
            maxWidth: 320, textAlign: 'center' }}>{status}</div>
        </div>
      )}

      <div onPointerDown={onPipDown} onPointerMove={onPipMove} onPointerUp={onPipUp} onPointerCancel={onPipUp}
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', right: pos.right, top: pos.top, width: PIP_W, height: PIP_H,
          borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.35)',
          background: '#1a1a1a', zIndex: 10, cursor: 'grab', touchAction: 'none',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}>
        <video ref={localRef} autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
            opacity: localVideo ? 1 : 0 }} />
        {!localVideo && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VideoOff size={22} color="rgba(255,255,255,0.6)" />
          </div>
        )}
      </div>
    </div>
  )
}