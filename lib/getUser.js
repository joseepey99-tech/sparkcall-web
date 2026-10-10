import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function getUser(request) {
  const h = request.headers.get('authorization')
  if (h?.startsWith('Bearer ')) {
    const { data } = await supabaseAdmin.auth.getUser(h.slice(7))
    if (data?.user) return data.user
  }
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}