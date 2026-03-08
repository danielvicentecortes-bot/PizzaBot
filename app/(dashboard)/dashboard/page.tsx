import { redirect } from 'next/navigation'

// Dashboard home redirects to menu management for now.
// A proper overview/analytics page can be added later.
export default function DashboardPage() {
  redirect('/dashboard/menu')
}
