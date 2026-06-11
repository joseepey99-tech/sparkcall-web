import { NextResponse } from 'next/server'
import { stripe, SPARK_PACKS } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request) {
  const { packId } = await request.json()
  const pack = SPARK_PACKS.find(p => p.id === packId)
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 400 })

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${pack.sparks} Sparks — ${pack.name}`,
          description: `SparkCall · ${pack.sparks} Sparks`,
        },
        unit_amount: pack.price,
      },
      quantity: 1,
    }],
    metadata: {
      userId: user.id,
      packId: pack.id,
      sparks: pack.sparks,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?cancelled=true`,
  })

  return NextResponse.json({ url: session.url })
}