'use client'

import { useState } from 'react'
import { login } from './actions'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const result = await login(null, new FormData(e.currentTarget))
    if (result?.error) setError(result.error)
    setPending(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Sign in to PizzaBot</h1>

        {error && (
          <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            style={{ padding: '0.625rem', background: '#E53E3E', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 600, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1 }}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', textAlign: 'center', color: '#6b7280' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: '#E53E3E', fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
