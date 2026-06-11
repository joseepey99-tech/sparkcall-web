'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/home')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', animation: 'fadeIn 0.3s ease' }}>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <Mark size={56} glow={true} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11,
            fontWeight: 300, letterSpacing: 7, color: 'var(--gold)' }}>SPARKCALL</span>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 28 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28,
            fontWeight: 700, marginBottom: 6 }}>
            Welcome <em style={{ color: 'var(--gold)' }}>back</em>
          </div>
          <div style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 24 }}>
            Sign in to continue your connections.
          </div>

          {['Email', 'Password'].map((label, i) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ color: 'var(--sub)', fontSize: 10, fontWeight: 600,
                letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>{label}</div>
              <input
                type={i === 1 ? 'password' : 'email'}
                value={i === 0 ? email : password}
                onChange={e => i === 0 ? setEmail(e.target.value) : setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder={i === 0 ? 'you@example.com' : '••••••••'}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 12,
                  color: 'var(--text)', fontSize: 15 }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}

          {error && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}

          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: loading ? '#1C1533' : 'linear-gradient(135deg, var(--gold), #A07840)',
              color: loading ? 'var(--sub)' : '#0C0817', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--sub)', fontSize: 14 }}>
            No account?{' '}
            <span onClick={() => router.push('/signup')}
              style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }}>
              Create one
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--sub)', fontSize: 11 }}>
          🔒 End-to-end encrypted
        </div>
      </div>
    </div>
  )
}