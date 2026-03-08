import { createClient } from '@/lib/supabase/server'
import TestChat from '@/components/dashboard/TestChat'
import type { Database } from '@/types/database'

export const metadata = { title: 'Test Chat — PizzaBot' }

type MessageRow = Database['public']['Tables']['messages']['Row']

// The test conversation uses a fixed external_id so it persists across page
// reloads and is separate from real customer conversations.
const TEST_EXTERNAL_ID = 'test_dashboard'

export default async function TestChatPage() {
  const supabase = createClient()

  // Resolve tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .single()

  if (!profile?.tenant_id) {
    return (
      <div className="p-8 text-red-600">Could not resolve tenant.</div>
    )
  }

  const tenantId = profile.tenant_id

  // Fetch bot name for the chat header
  const { data: tenant } = await supabase
    .from('tenants')
    .select('bot_name, name, welcome_message')
    .eq('id', tenantId)
    .single()

  const botName =
    (tenant as { bot_name: string | null } | null)?.bot_name ??
    `${(tenant as { name: string } | null)?.name ?? 'PizzaBot'} Assistant`

  const welcomeMessage =
    (tenant as { welcome_message: string | null } | null)?.welcome_message ??
    null

  // Upsert the test conversation (idempotent — UNIQUE on tenant_id + channel_type + external_id)
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .upsert(
      {
        tenant_id:    tenantId,
        channel_type: 'whatsapp' as const,
        external_id:  TEST_EXTERNAL_ID,
        status:       'active' as const,
      },
      { onConflict: 'tenant_id,channel_type,external_id' },
    )
    .select('id')
    .single()

  if (convError || !conv) {
    return (
      <div className="p-8 text-red-600">
        Failed to initialise test conversation: {convError?.message}
      </div>
    )
  }

  // Load recent message history
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })
    .limit(100)

  return (
    <div className="flex flex-col h-full">
      <TestChat
        tenantId={tenantId}
        conversationId={conv.id}
        initialMessages={(messages ?? []) as MessageRow[]}
        botName={botName}
        welcomeMessage={welcomeMessage}
      />
    </div>
  )
}
