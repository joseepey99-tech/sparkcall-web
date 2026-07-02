// app/api/calls/create/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    let userId = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) userId = user.id
    }
    if (!userId) {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (n) => cookieStore.get(n)?.value } }
      )
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { hostId } = await request.json()
    if (!hostId) return NextResponse.json({ error: 'hostId required' }, { status: 400 })

    // Create Daily.co room
    const roomName = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          enable_chat: true,
          enable_screenshare: false,
          enable_prejoin_ui: false,
        },
      }),
    })

    const room = await dailyRes.json()
    if (!room.url) return NextResponse.json({ error: 'Room creation failed' }, { status: 500 })

    // Save call with status = PENDING
    const { data: call, error } = await supabaseAdmin.from('calls').insert({
      caller_id: userId,
      host_id: hostId,
      room_name: roomName,
      room_url: room.url,
      status: 'pending',
    }).select().single()

    if (error) throw error

    return NextResponse.json({
      roomUrl: room.url,
      roomName: roomName,
      callId: call.id,
      status: 'pending',
    })
  } catch (err) {
    console.error('Create call error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

