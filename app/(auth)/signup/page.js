'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Mark from '@/components/Mark'

const ALL_INTERESTS = ['Travel','Music','Art','Fitness','Gaming','Tech',
  'Food','Books','Film','Fashion','Yoga','Dance','Sports','Comedy','Photography']

function isAdult(d) { if (!d) return false; const b = new Date(d + 'T00:00:00'); if (isNaN(b)) return false; const n = new Date(); let a = n.getFullYear() - b.getFullYear(); const m = n.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--; return a >= 18 }

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', email: '', password: '', gender: '',
    bio: '', city: '', interests: [], isHost: false, dob: '', terms: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const toggleInterest = i => update('interests',
    form.interests.includes(i)
      ? form.interests.filter(x => x !== i)
      : form.interests.length < 5 ? [...form.interests, i] : form.interests)

  const handleSignup = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password, options: { data: { name: form.name, gender: form.gender, bio: form.bio, city: form.city, birth_date: form.dob, terms: String(form.terms) } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    router.push('/home')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 12,
    color: 'var(--text)', fontSize: 15,
  }
  const labelStyle = {
    color: 'var(--sub)', fontSize: 10, fontWeight: 600,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7, display: 'block',
  }
  const btnStyle = {
    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
    background: 'linear-gradient(135deg, var(--gold), #A07840)',
    color: '#0C0817', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <Mark size={48} glow={true} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11,
            fontWeight: 300, letterSpacing: 7, color: 'var(--gold)' }}>SPARKCALL</span>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[0,1,2].map(x => (
            <div key={x} style={{ flex: 1, height: 3, borderRadius: 99,
              background: step >= x ? 'var(--gold)' : 'var(--border)',
              transition: 'background 0.3s' }}/>
          ))}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 28 }}>

          {/* Step 0 — Basic info */}
          {step === 0 && <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26,
              fontWeight: 700, marginBottom: 20 }}>
              Create your <em style={{ color: 'var(--gold)' }}>account</em>
            </div>

            {[
              { label: 'Full Name', key: 'name', type: 'text', ph: 'Your name' },
              { label: 'Email',     key: 'email', type: 'email', ph: 'you@example.com' },
              { label: 'Password',  key: 'password', type: 'password', ph: 'Min 6 characters' },
              { label: 'Date of birth (18+)', key: 'dob', type: 'date', ph: '' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} value={form[f.key]}
                  onChange={e => update(f.key, e.target.value)}
                  placeholder={f.ph} style={{ ...inputStyle, colorScheme: 'dark' }} max={f.type === 'date' ? new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10) : undefined} min={f.type === 'date' ? '1900-01-01' : undefined}
                  onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>I am a…</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: 'M', l: '♂  Male' }, { v: 'F', l: '♀  Female' }].map(g => (
                  <button key={g.v} onClick={() => update('gender', g.v)}
                    style={{ flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${form.gender === g.v ? 'var(--gold)' : 'var(--border)'}`,
                      background: form.gender === g.v ? 'rgba(201,164,106,0.1)' : 'transparent',
                      color: form.gender === g.v ? 'var(--gold)' : 'var(--sub)',
                      fontWeight: 600, fontSize: 14 }}>
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--sub)', fontSize: 12, marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.terms} onChange={e => update('terms', e.target.checked)} style={{ marginTop: 2 }} />
              <span>I am 18 or older and I accept the <a href="/terms" target="_blank" style={{ color: 'var(--gold)' }}>Terms</a> and <a href="/privacy" target="_blank" style={{ color: 'var(--gold)' }}>Privacy Policy</a>.</span>
            </label>
            {error && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
            <button onClick={() => {
              if (!form.name || !form.email || !form.password || !form.gender || !form.dob)
                { setError('Please fill in all fields.'); return }
              if (!isAdult(form.dob)) { setError('You must be 18 or older to use SparkCall.'); return }
              if (!form.terms) { setError('Please accept the Terms and Privacy Policy.'); return }
              if (form.password.length < 6)
                { setError('Password must be at least 6 characters.'); return }
              setError(''); setStep(1)
            }} style={btnStyle}>Continue →</button>

            <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--sub)', fontSize: 14 }}>
              Already have an account?{' '}
              <span onClick={() => router.push('/login')}
                style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }}>
                Sign in
              </span>
            </div>
          </>}

          {/* Step 1 — Interests */}
          {step === 1 && <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26,
              fontWeight: 700, marginBottom: 6 }}>
              Your <em style={{ color: 'var(--gold)' }}>interests</em>
            </div>
            <div style={{ color: 'var(--sub)', fontSize: 13, marginBottom: 20 }}>
              Pick up to 5
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
              {ALL_INTERESTS.map(i => (
                <button key={i} onClick={() => toggleInterest(i)}
                  style={{ padding: '7px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 13,
                    border: `1px solid ${form.interests.includes(i) ? 'var(--gold)' : 'var(--border)'}`,
                    background: form.interests.includes(i) ? 'rgba(201,164,106,0.1)' : 'transparent',
                    color: form.interests.includes(i) ? 'var(--gold)' : 'var(--sub)' }}>
                  {i}
                </button>
              ))}
            </div>
            <button onClick={() => { if (!form.interests.length) return; setStep(2) }}
              style={{ ...btnStyle, opacity: form.interests.length ? 1 : 0.5 }}>
              Next →
            </button>
          </>}

          {/* Step 2 — Role */}
          {step === 2 && <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26,
              fontWeight: 700, marginBottom: 6 }}>
              One more <em style={{ color: 'var(--gold)' }}>thing</em>
            </div>
            <div style={{ color: 'var(--sub)', fontSize: 13, marginBottom: 8 }}>
              How will you use SparkCall?
            </div>
            <div style={{ padding: '8px 12px', background: 'rgba(201,164,106,0.08)',
              border: '1px solid rgba(201,164,106,0.2)', borderRadius: 10,
              fontSize: 12, color: 'var(--gold)', marginBottom: 20 }}>
              ✦ Hosting is by request. You can apply from Settings after signing up, and applications are reviewed.
            </div>

            {[
              { v: false, icon: '🔍', title: 'I want to meet people', sub: 'Browse & call hosts.' },
              { v: true,  icon: '🎙', title: 'I want to apply as a host',   sub: 'You can apply later from Settings. Applications are reviewed.' },
            ].map(opt => (
              <div key={String(opt.v)} onClick={() => update('isHost', opt.v)}
                style={{ background: form.isHost === opt.v ? 'rgba(201,164,106,0.1)' : 'var(--surface)',
                  border: `1.5px solid ${form.isHost === opt.v ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: 14, padding: '16px 18px', marginBottom: 12,
                  cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 28 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15,
                    color: form.isHost === opt.v ? 'var(--gold)' : 'var(--text)' }}>
                    {opt.title}
                  </div>
                  <div style={{ color: 'var(--sub)', fontSize: 13, marginTop: 2 }}>{opt.sub}</div>
                </div>
              </div>
            ))}

            {error && <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
            <button onClick={handleSignup} disabled={loading}
              style={{ ...btnStyle, opacity: loading ? 0.6 : 1, marginTop: 8 }}>
              {loading ? 'Creating account…' : '🚀 Enter SparkCall'}
            </button>
          </>}
        </div>
      </div>
    </div>
  )
}
