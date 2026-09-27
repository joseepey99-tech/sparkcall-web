'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
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
    </div>
  )
}