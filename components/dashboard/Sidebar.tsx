'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/login/actions'

const NAV_ITEMS = [
  { href: '/dashboard/menu',          label: 'Menu' },
  { href: '/dashboard/orders',        label: 'Orders' },
  { href: '/dashboard/reservations',  label: 'Reservations' },
  { href: '/dashboard/conversations', label: 'Conversations' },
  { href: '/dashboard/faqs',          label: 'FAQs' },
  { href: '/dashboard/settings',      label: 'Settings' },
]

export default function Sidebar({ tenantName }: { tenantName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-700">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          PizzaBot
        </p>
        <p className="mt-1 text-sm font-semibold text-white truncate">
          {tenantName}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-4 border-t border-gray-700">
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
