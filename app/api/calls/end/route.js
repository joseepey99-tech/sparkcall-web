import { NextResponse } from 'next/server'
import { supabaseAdmin, getUser } from '@/lib/getUser'

export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { callId } = await request.json()
    if (!callId) return NextResponse.json({ error: 'callId required' }, { status: 400 })

    const { data: call } = await supabaseAdmin
      .from('calls').select('caller_id, host_id').eq('id', callId).single()
    if (!call || (user.id !== call.caller_id && user.id !== call.host_id))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabaseAdmin.rpc('settle_call', { p_call_id: callId })
    if (error) throw error
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    console.error('End call error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}