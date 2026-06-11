// app/api/account/delete/route.js
// Place in: C:\Users\LENOVO\SPCALL\sparkcall\app\api\account\delete\route.js

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // Delete all user data
    await Promise.all([
      supabaseAdmin.from('messages').delete().eq('sender_id', user.id),
      supabaseAdmin.from('messages').delete().eq('receiver_id', user.id),
      supabaseAdmin.from('gifts').delete().eq('sender_id', user.id),
      supabaseAdmin.from('gifts').delete().eq('receiver_id', user.id),
      supabaseAdmin.from('reviews').delete().eq('caller_id', user.id),
      supabaseAdmin.from('reviews').delete().eq('host_id', user.id),
      supabaseAdmin.from('transactions').delete().eq('user_id', user.id),
      supabaseAdmin.from('calls').delete().eq('caller_id', user.id),
    ])

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
