'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft } from 'lucide-react'

export default function EarningsPage() {
  const router = useRouter()
  const [bal, setBal] = useState(null)
  const [reqs, setReqs] = useState([])
  const [method, setMethod] = useState('paypal')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: me } = await sb.from('public_profiles').select('is_host').eq('id', user.id).single()
    if (!me?.is_host) { router.replace('/home'); return }
    const { data, error } = await sb.rpc('host_balance')
    if (error) { setErr(error.message); return }
    setBal(data)
    const { data: r } = await sb.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(10)
    setReqs(r || [])
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    setBusy(true); setMsg(''); setErr('')
    const sb = createClient()
    const { data, error } = await sb.rpc('request_payout', { p_method: method, p_details: details })
    if (error) {
      setErr(error.message.includes('below minimum') ? 'Your available balance is below the minimum payout.' :
        error.message.includes('only hosts') ? 'Only hosts can request payouts.' : error.message)
    } else {
      setMsg('Payout requested: $' + data.amount_usd + '. We will pay you and mark it as paid.')
      setDetails('')
      await load()
    }
    setBusy(false)
  }

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14 }
  const input = { width: '100%', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 14, marginTop: 8 }
  const canAsk = bal && bal.available_usd >= bal.min_payout_usd && details.trim().length >= 3

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px', color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}><ChevronLeft size={22} /></button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Earnings</div>
      </div>

      {err && <div style={{ ...card, borderColor: 'var(--rose)', color: 'var(--rose)', fontSize: 13 }}>{err}</div>}
      {msg && <div style={{ ...card, borderColor: 'rgba(80,200,120,0.5)', fontSize: 13 }}>{msg}</div>}

      {bal && (
        <>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--sub)' }}>Available to withdraw</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--gold)' }}>${Number(bal.available_usd).toFixed(2)}</div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 4 }}>
              Total earned: ${Number(bal.total_usd).toFixed(2)} ({bal.total_sparks} Sparks)
            </div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 4 }}>
              1 Spark earned = ${bal.usd_per_spark}. New earnings become available after {bal.hold_days} days. Minimum payout: ${bal.min_payout_usd}.
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600 }}>Request a payout</div>
            <select value={method} onChange={e => setMethod(e.target.value)} style={input}>
              <option value="paypal">PayPal</option>
              <option value="wise">Wise</option>
              <option value="bank">Bank transfer</option>
              <option value="mobile_money">Mobile money</option>
              <option value="other">Other</option>
            </select>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} maxLength={300}
              placeholder="PayPal email, Wise email, bank IBAN, or mobile money number and provider"
              style={{ ...input, resize: 'none' }} />
            <button onClick={submit} disabled={!canAsk || busy}
              style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 14, border: 'none', fontWeight: 600, fontSize: 14,
                background: canAsk ? 'linear-gradient(135deg, var(--gold), #A07840)' : 'rgba(255,255,255,0.08)',
                color: canAsk ? '#0C0817' : 'var(--sub)', cursor: canAsk ? 'pointer' : 'default' }}>
              {busy ? 'Sending...' : 'Request payout'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 8 }}>Never share card numbers or passwords.</div>
          </div>

          {reqs.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Your requests</div>
              {reqs.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                  <span>{new Date(r.created_at).toLocaleDateString()} · {r.method}</span>
                  <span>${Number(r.amount_usd).toFixed(2)} · {r.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}