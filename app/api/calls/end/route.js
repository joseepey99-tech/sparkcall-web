import { NextResponse } from 'next/server'
import { deleteRoom } from '@/lib/daily'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { callId, roomName, durationSeconds, sparksSpent, callerId } = await request.json()

    console.log('End call:', { callId, durationSeconds, sparksSpent, callerId })

    // Update call record
    const { error: callError } = await supabaseAdmin
      .from('calls')
      .update({
        duration_seconds: durationSeconds,
        sparks_spent: sparksSpent,
        status: 'completed',
      })
      .eq('id', callId)

    if (callError) console.error('Call update error:', callError)

    // Deduct sparks from caller
    if (sparksSpent > 0 && callerId) {
      const { error: deductError } = await supabaseAdmin.rpc('add_sparks', {
        user_id: callerId,
        amount: -sparksSpent,
      })
      if (deductError) console.error('Spark deduction error:', deductError)
      else console.log(`Deducted ${sparksSpent} sparks from ${callerId}`)
    }

    // Add earnings to host (70%)
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('host_id')
      .eq('id', callId)
      .single()

    if (call?.host_id && sparksSpent > 0) {
      const hostEarnings = sparksSpent * 0.7 * 0.015

      // Get current host values
      const { data: hostProfile } = await supabaseAdmin
        .from('profiles')
        .select('total_earnings, total_calls')
        .eq('id', call.host_id)
        .single()

      if (hostProfile) {
        const { error: hostError } = await supabaseAdmin
          .from('profiles')
          .update({
            total_earnings: (hostProfile.total_earnings || 0) + hostEarnings,
            total_calls: (hostProfile.total_calls || 0) + 1,
          })
          .eq('id', call.host_id)

        if (hostError) console.error('Host earnings error:', hostError)
      }
    }

    // Delete Daily.co room
    if (roomName) {
      await deleteRoom(roomName)
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('End call error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}