import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the tenant name for the sidebar header (two queries to avoid
  // join type complexity with hand-authored Database types).
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .single()

  let tenantName = 'My Pizzeria'
  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single()
    if (tenant?.name) tenantName = tenant.name
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar tenantName={tenantName} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
