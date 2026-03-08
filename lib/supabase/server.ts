/**
 * Supabase server client — for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes auth cookies via Next.js `cookies()`.
 *
 * For webhook routes that require bypassing RLS, pass useServiceRole = true
 * and ensure SUPABASE_SERVICE_ROLE_KEY is set (never expose to browser).
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient(useServiceRole = false) {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    useServiceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // Auth middleware handles cookie mutations.
          }
        },
      },
    }
  )
}
