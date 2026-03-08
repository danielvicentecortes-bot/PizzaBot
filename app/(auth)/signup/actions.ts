'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type SignUpState = { error: string } | null

/**
 * Converts a pizzeria display name into a URL-safe slug.
 * e.g. "Mario's Pizzeria!" → "mario-s-pizzeria"
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric → hyphen
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
    .slice(0, 63)                    // max slug length
}

/**
 * Sign-up Server Action.
 *
 * Flow:
 *   1. Validate form inputs server-side.
 *   2. Call supabase.auth.signUp() with tenant metadata in options.data.
 *   3. The DB trigger (0002_signup_trigger.sql) atomically creates:
 *        tenants + profiles + subscriptions
 *      in the same transaction as the auth.users INSERT.
 *   4. Redirect to the dashboard on success.
 *
 * If the slug is already taken the DB trigger raises a unique-constraint
 * violation, which Supabase surfaces as an auth error — we map it to a
 * friendly message.
 */
export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email        = (formData.get('email')         as string)?.trim()
  const password     =  formData.get('password')       as string
  const fullName     = (formData.get('full_name')      as string)?.trim()
  const pizzeriaName = (formData.get('pizzeria_name')  as string)?.trim()

  // ── Server-side validation ────────────────────────────────
  if (!email || !password || !fullName || !pizzeriaName) {
    return { error: 'All fields are required.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const slug = toSlug(pizzeriaName)
  if (!slug) {
    return { error: 'Pizzeria name must contain at least one letter or number.' }
  }

  // ── Attempt sign-up ───────────────────────────────────────
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name:   fullName,
        tenant_name: pizzeriaName,
        tenant_slug: slug,
      },
    },
  })

  if (error) {
    // Slug uniqueness violation from the DB trigger appears as a generic
    // "Database error saving new user" message from Supabase auth.
    if (
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique') ||
      error.message.toLowerCase().includes('database error')
    ) {
      return {
        error:
          'A pizzeria with that name is already registered. ' +
          'Please choose a different name or contact support.',
      }
    }
    return { error: error.message }
  }

  // On success the DB trigger has already created tenant/profile/subscription.
  redirect('/')
}
