import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function credit(eventId, userId, sparks, type, amountUsd, ref) {
  const n = parseInt(sparks)
  if (!userId || !Number.isFinite(n) || n <= 0) throw new Error('bad credit data')
  const { error } = await supabaseAdmin.rpc('apply_stripe_credit', {
    p_event_id: eventId, p_user: userId, p_sparks: n,
    p_type: type, p_amount: amountUsd, p_ref: ref,
  })
  if (error) throw error
}

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object
      if (s.payment_status === 'paid') {
        const { userId, sparks, planId, sparksBonus } = s.metadata || {}
        if (sparks) {
          await credit(event.id, userId, sparks, 'purchase', s.amount_total / 100, s.id)
        } else if (planId) {
          await supabaseAdmin.from('profiles').update({ premium: planId }).eq('id', userId)
          await credit(event.id, userId, sparksBonus, 'subscription', s.amount_total / 100, s.id)
        }
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const inv = event.data.object
      const subId = inv.subscription || inv.parent?.subscription_details?.subscription
      // The first invoice is already credited by checkout.session.completed
      if (subId && inv.billing_reason === 'subscription_cycle') {
        const sub = await stripe.subscriptions.retrieve(subId)
        const { userId, sparksBonus } = sub.metadata || {}
        if (userId && sparksBonus) {
          await credit(event.id, userId, sparksBonus, 'subscription', inv.amount_paid / 100, inv.id)
        }
      }
    }

    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const obj = event.data.object
      const piId = obj.payment_intent
      const full = event.type === 'charge.dispute.created' || obj.refunded === true
      if (piId && full) {
        const list = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 })
        const sid = list.data[0]?.id
        if (sid) {
          const { error } = await supabaseAdmin.rpc('reverse_stripe_credit', { p_event_id: event.id, p_session: sid })
          if (error) throw error
        }
      } else {
        console.warn('Refund needs manual review:', event.id)
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const { userId } = event.data.object.metadata || {}
      if (userId) await supabaseAdmin.from('profiles').update({ premium: null }).eq('id', userId)
    }
  } catch (err) {
    console.error('Webhook processing error:', event.type, err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}