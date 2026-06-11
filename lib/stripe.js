import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

export const SPARK_PACKS = [
  { id: 'starter',   name: 'Starter',    sparks: 200,  price: 299,  priceId: 'price_starter'  },
  { id: 'popular',   name: 'Popular',    sparks: 600,  price: 799,  priceId: 'price_popular'  },
  { id: 'bestvalue', name: 'Best Value', sparks: 2000, price: 1999, priceId: 'price_bestvalue' },
]

export const PREMIUM_PLANS = [
  { id: 'gold',     name: 'Gold',     price: 999,  sparksBonus: 200, priceId: 'price_gold'     },
  { id: 'platinum', name: 'Platinum', price: 1999, sparksBonus: 500, priceId: 'price_platinum' },
]