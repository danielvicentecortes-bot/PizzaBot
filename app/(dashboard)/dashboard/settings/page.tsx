import { createClient } from '@/lib/supabase/server'
import BotSettingsForm from '@/components/dashboard/settings/BotSettingsForm'
import { DEFAULT_OPERATING_HOURS } from './actions'
import type { Database } from '@/types/database'
import type { OperatingHours } from './actions'

export const metadata = { title: 'Settings — PizzaBot' }

type TenantRow = Database['public']['Tables']['tenants']['Row']

export default async function SettingsPage() {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .single()

  if (!profile?.tenant_id) {
    return (
      <div className="p-8 text-red-600">Could not load tenant settings.</div>
    )
  }

  const { data: rawTenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  if (error || !rawTenant) {
    return (
      <div className="p-8 text-red-600">
        Failed to load settings: {error?.message ?? 'Tenant not found'}
      </div>
    )
  }

  // Cast needed because select('*') wildcard inference doesn't always
  // propagate newly-added columns through the SDK's type machinery.
  const tenant = rawTenant as TenantRow

  const operatingHours: OperatingHours =
    (tenant.operating_hours as OperatingHours | null) ?? DEFAULT_OPERATING_HOURS

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bot Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure how your chatbot introduces itself and responds to
            customers.
          </p>
        </div>

        <BotSettingsForm
          tenant={tenant as TenantRow}
          initialOperatingHours={operatingHours}
        />
      </div>
    </div>
  )
}
