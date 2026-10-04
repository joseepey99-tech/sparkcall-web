import { createClient } from '@/lib/supabase'

const EXPIRES = 6 * 3600

export function chatPath(m) {
  if (m && m.media_path) return m.media_path
  if (m && m.media_url) return String(m.media_url).split('/ChatMedia/')[1] || null
  return null
}

export async function getSignedUrls(paths) {
  const out = {}
  if (!paths.length) return out
  const supabase = createClient()
  const { data } = await supabase.storage.from('ChatMedia').createSignedUrls(paths, EXPIRES)
  const rows = data || []
  rows.forEach(d => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl })
  return out
}