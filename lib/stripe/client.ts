/**
 * Stripe clients.
 * - `stripe` (server-only): full API access via secret key.
 * - Use `@stripe/stripe-js` loadStripe() on the client side when needed.
 */
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
