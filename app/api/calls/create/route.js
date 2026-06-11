import { NextResponse } from 'next/server'
import { createRoom } from '@/lib/daily'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { hostId } = await request.json()
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Daily.co room
    const room = await createRoom()
    console.log('Daily room response:', room)

    if (!room || !room.url) {
      return NextResponse.json(
        { error: 'Failed to create video room', details: room },
        { status: 500 }
      )
    }

    // Create call record in database
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        caller_id: user.id,
        host_id: hostId,
        status: 'active',
      })
      .select()
      .single()

    if (callError) {
      console.error('Call insert error:', callError)
      return NextResponse.json({ error: callError.message }, { status: 500 })
    }

    return NextResponse.json({
      roomUrl: room.url,
      roomName: room.name,
      callId: call.id,
    })

  } catch (err) {
    console.error('Create call error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}