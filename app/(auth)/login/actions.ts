'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = { error: string } | null

/**
 * Login Server Action.
 *
 * Uses Supabase email + password auth. On success the session cookie is
 * set by @supabase/ssr and the user is redirected to the dashboard.
 * The middleware (middleware.ts) will then enforce auth on protected routes.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email    = (formData.get('email')    as string)?.trim()
  const password =  formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Avoid leaking whether the email exists; use a generic message.
    return { error: 'Invalid email or password.' }
  }

  redirect('/')
}

/**
 * Sign-out Server Action.
 * Can be called from any server action or form in the dashboard.
 */
export async function logout(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
