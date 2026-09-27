'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'


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
    } catch (e) {}
  }

  return (
    <>
      {poster ? (
        <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
         <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          crossOrigin="anonymous"
          preload="auto"
          onLoadedData={() => {
            const video = videoRef.current
            if (video) video.currentTime = 0.1
          }}
          onSeeked={captureFrame}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </>
  )
}

  export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [videos, setVideos] = useState([])
  const [videoUploading, setVideoUploading] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(null)

  const MAX_VIDEOS = 4
  const MAX_DURATION = 30

  useEffect(() => { load(); loadVideos() }, [])

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  const loadVideos = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profile_videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setVideos(data || [])
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('Avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('Avatars').getPublicUrl(path)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
      if (updateError) throw updateError

      setProfile(p => ({ ...p, avatar_url: avatarUrl }))
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Something went wrong.'))
    } finally {
      setUploading(false)
    }
  }
  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      video.onerror = () => reject(new Error('Could not read video'))
      video.src = URL.createObjectURL(file)
    })
  }

  const handleVideoChange = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (videos.length >= MAX_VIDEOS) {
      alert(`You can post up to ${MAX_VIDEOS} videos. Delete one to add another.`)
      return
    }
    setVideoUploading(true)
    try {
      const duration = await getVideoDuration(file)
      if (duration > MAX_DURATION + 1) {
        alert(`Please choose a video under ${MAX_DURATION} seconds.`)
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop() || 'mp4'
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('Videos')
        .upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('Videos').getPublicUrl(path)

      const { error: insertError } = await supabase.from('profile_videos').insert({
        user_id: user.id,
        video_url: urlData.publicUrl,
        duration_seconds: Math.round(duration),
      })
      if (insertError) throw insertError

      loadVideos()
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Something went wrong.'))
    } finally {
      setVideoUploading(false)
    }
  }

  const handleDeleteVideo = async (video) => {
    if (!confirm('Remove this video from your profile?')) return
    const supabase = createClient()
    await supabase.from('profile_videos').delete().eq('id', video.id)
    const path = video.video_url.split('/Videos/')[1]
    if (path) await supabase.storage.from('Videos').remove([path])
    loadVideos()
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDelete = async () => {
    if (!confirm('This will permanently delete your account, all credits, call history and personal data. This cannot be undone. Continue?')) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      alert('Failed to delete account: ' + (err.message || ''))
      setDeleting(false)
    }
  }

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: 'var(--sub)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 480, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()}
          style={{ background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 99, width: 36, height: 36,
            cursor: 'pointer', fontSize: 16 }}>←</button>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700 }}>Settings</h1>
      </div>

      {/* Profile card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <label style={{ position: 'relative', cursor: 'pointer', display: 'block' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32,
            background: 'rgba(214,63,110,0.2)', border: '1.5px solid rgba(214,63,110,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 22, color: 'var(--rose)', fontWeight: 700 }}>{profile.name?.charAt(0)}</span>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22,
            borderRadius: 11, background: 'var(--rose)', border: '2px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {uploading ? '…' : '✎'}
          </div>
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </label>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{profile.name}</div>
          <div style={{ fontSize: 12, color: 'var(--sub)' }}>{profile.email}</div>
        </div>
      </div>
      {/* My Videos */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          My Videos ({videos.length}/{MAX_VIDEOS})
        </div>
        <div style={{ color: 'var(--sub)', fontSize: 12, marginBottom: 12 }}>
          Short clips (max {MAX_DURATION}s) that show who you are.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {videos.map((v, i) => (
            <div key={v.id} style={{ position: 'relative', width: 90, height: 130,
              borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)',
              background: 'var(--bg)', cursor: 'pointer' }}
              onClick={() => setPlayingIndex(i)}>
              <VideoThumb src={v.video_url} />
              <div style={{ position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: 18,
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 14, marginLeft: 2 }}>▶</span>
              </div>
              <div style={{ position: 'absolute', bottom: 6, left: 6,
                background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 6px',
                color: '#fff', fontSize: 10 }}>
                {v.duration_seconds}s
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteVideo(v) }}
                style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
                  background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 12,
                  cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          {videos.length < MAX_VIDEOS && (
            <label style={{ width: 90, height: 130, borderRadius: 12, background: 'var(--card)',
              border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 20, color: 'var(--rose)' }}>{videoUploading ? '…' : '+'}</span>
              <span style={{ color: 'var(--sub)', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Add video</span>
              <input type="file" accept="video/*" onChange={handleVideoChange} disabled={videoUploading}
                style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      <button onClick={handleSignOut}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', marginBottom: 24 }}>
        Sign out
      </button>

      <div style={{ background: 'rgba(255,68,85,0.05)', borderRadius: 16, padding: 16,
        border: '1px solid rgba(255,68,85,0.2)' }}>
        <div style={{ color: 'var(--sub)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
          Deleting your account is permanent. All your credits, call history, and personal data will be erased immediately.
        </div>
                <button onClick={handleDelete} disabled={deleting}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid rgba(255,68,85,0.4)',
            background: 'rgba(255,68,85,0.15)', color: '#FF4455', fontSize: 14, fontWeight: 700,
            cursor: deleting ? 'not-allowed' : 'pointer' }}>
          {deleting ? 'Deleting…' : 'Delete Forever'}
        </button>
      </div>

      {playingIndex !== null && videos[playingIndex] && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src={videos[playingIndex].video_url} controls autoPlay
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