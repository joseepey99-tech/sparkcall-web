import { NextResponse } from 'next/server'
import { stripe, PREMIUM_PLANS } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { planId } = await request.json()
    const plan = PREMIUM_PLANS.find(p => p.id === planId)
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 400 })

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `SparkCall ${plan.name}`,
            description: `${plan.sparksBonus} bonus Sparks/month + premium features`,
          },
          unit_amount: plan.price,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: {
        userId: user.id,
        planId: plan.id,
        sparksBonus: plan.sparksBonus,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Subscription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}