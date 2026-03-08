/**
 * POST /api/chat
 *
 * The central AI engine. Called by:
 *   - Webhook handlers (/api/webhooks/twilio, /api/webhooks/telegram)
 *   - The dashboard Test Chat page
 *
 * Uses the **service role** key so it can write on behalf of any tenant
 * without being blocked by RLS. Never expose this route's internals to
 * the browser — only the minimal { response, conversation_id } is returned.
 *
 * Request body:
 *   tenant_id       string   (required)
 *   conversation_id string   (required — caller must upsert the conversation first)
 *   message         string   (required — the end-customer's message text)
 *   channel_type    string?  (optional, defaults to 'whatsapp')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, CHAT_MODEL, MAX_TOKENS } from '@/lib/anthropic/client'
import {
  buildSystemPrompt,
  type CategoryWithItems,
} from '@/lib/anthropic/buildSystemPrompt'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse and validate request ──────────────────────────
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { tenant_id, conversation_id, message, channel_type } = body as {
      tenant_id:       string
      conversation_id: string
      message:         string
      channel_type?:   string
    }

    if (!tenant_id || !conversation_id || !message?.trim()) {
      return NextResponse.json(
        { error: 'tenant_id, conversation_id and message are required' },
        { status: 400 },
      )
    }

    // Service role — bypasses RLS so webhooks can write for any tenant.
    const supabase = createClient(true)

    // ── 2. Verify the conversation belongs to this tenant ───────
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found or does not belong to tenant' },
        { status: 404 },
      )
    }

    // ── 3. Save the incoming user message ───────────────────────
    await supabase.from('messages').insert({
      tenant_id,
      conversation_id,
      role:    'user',
      content: message.trim(),
    })

    // ── 4. Fetch conversation history (last 20 messages) ────────
    // Includes the message we just saved, so the last item is the user turn.
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .in('role', ['user', 'assistant'])   // skip any 'system' rows
      .order('created_at', { ascending: true })
      .limit(20)

    // ── 5. Load tenant settings (bot config) ────────────────────
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenant_id)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // ── 6. Load active menu (4-level hierarchy) ─────────────────
    const { data: categories } = await supabase
      .from('menu_categories')
      .select(
        `*, menu_items(
           *, menu_option_groups(
             *, menu_options(*)
           )
         )`,
      )
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('sort_order', { ascending: true, referencedTable: 'menu_items' })
      .order('sort_order', { ascending: true, referencedTable: 'menu_option_groups' })
      .order('sort_order', { ascending: true, referencedTable: 'menu_options' })

    // ── 7. Load active FAQs ─────────────────────────────────────
    const { data: faqs } = await supabase
      .from('faqs')
      .select('question, answer')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // ── 8. Build system prompt ──────────────────────────────────
    // Cast needed: select('*') wildcard doesn't propagate new columns through
    // the SDK's type machinery when using a hand-authored Database type.
    const systemPrompt = buildSystemPrompt({
      tenant:      tenant as Parameters<typeof buildSystemPrompt>[0]['tenant'],
      categories:  (categories ?? []) as CategoryWithItems[],
      faqs:        faqs ?? [],
      channelType: channel_type ?? 'whatsapp',
    })

    // ── 9. Call Claude ──────────────────────────────────────────
    const claudeMessages = (history ?? []).map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const completion = await anthropic.messages.create({
      model:      CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages:   claudeMessages,
    })

    const aiResponse =
      completion.content[0]?.type === 'text' ? completion.content[0].text : ''

    // ── 10. Persist the assistant response ──────────────────────
    await supabase.from('messages').insert({
      tenant_id,
      conversation_id,
      role:    'assistant',
      content: aiResponse,
    })

    return NextResponse.json({ response: aiResponse, conversation_id })
  } catch (err) {
    console.error('[POST /api/chat]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
