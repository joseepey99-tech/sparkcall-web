import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook error:', err.message)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }

  // One-time Spark purchase
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { userId, sparks, planId, sparksBonus } = session.metadata

    // Spark pack purchase
    if (sparks) {
      await supabaseAdmin.rpc('add_sparks', {
        user_id: userId,
        amount: parseInt(sparks),
      })
      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        type: 'purchase',
        sparks: parseInt(sparks),
        amount_usd: session.amount_total / 100,
        status: 'completed',
        stripe_session_id: session.id,
      })
    }

    // Premium subscription
    if (planId) {
      await supabaseAdmin
        .from('profiles')
        .update({ premium: planId })
        .eq('id', userId)

      await supabaseAdmin.rpc('add_sparks', {
        user_id: userId,
        amount: parseInt(sparksBonus),
      })

      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        type: 'subscription',
        sparks: parseInt(sparksBonus),
        amount_usd: session.amount_total / 100,
        status: 'completed',
        stripe_session_id: session.id,
      })
    }
  }

  // Monthly renewal — add bonus Sparks again
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
      const { userId, planId, sparksBonus } = subscription.metadata
      if (userId && sparksBonus) {
        await supabaseAdmin.rpc('add_sparks', {
          user_id: userId,
          amount: parseInt(sparksBonus),
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}