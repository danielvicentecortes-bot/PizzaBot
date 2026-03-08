'use server'

import { createClient } from '@/lib/supabase/server'

export async function clearTestConversation(
  conversationId: string,
): Promise<{ error: string } | null> {
  try {
    const supabase = createClient() // anon key — RLS scopes delete to the owner's tenant

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) return { error: error.message }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
