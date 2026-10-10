import { NextResponse } from 'next/server'
import { supabaseAdmin, getUser } from '@/lib/getUser'

export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { callId } = await request.json()

    const { data: call } = await supabaseAdmin
      .from('calls').select('caller_id, host_id, status').eq('id', callId).single()
    if (!call || (user.id !== call.caller_id && user.id !== call.host_id) || call.status !== 'pending')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabaseAdmin.from('calls')
      .update({ status: 'rejected' }).eq('id', callId).eq('status', 'pending')
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}