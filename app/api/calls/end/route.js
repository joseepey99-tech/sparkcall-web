// app/api/calls/end/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { callId, durationSeconds, sparksSpent, callerId } = await request.json()
    if (!callId) return NextResponse.json({ error: 'callId required' }, { status: 400 })

    // Update call status to ENDED — triggers Realtime on web side
    await supabaseAdmin.from('calls').update({
      status: 'ended',
      duration_seconds: durationSeconds || 0,
      sparks_spent: sparksSpent || 0,
    }).eq('id', callId)

    // Deduct sparks from caller
    if (callerId && sparksSpent > 0) {
      await supabaseAdmin.rpc('add_sparks', {
        user_id: callerId,
        amount: -sparksSpent,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('End call error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
