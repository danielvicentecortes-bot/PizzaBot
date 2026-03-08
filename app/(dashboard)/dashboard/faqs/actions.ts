'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const FAQS_PATH = '/dashboard/faqs'

type ActionResult = { error: string } | null

async function requireTenantId(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .single()
  if (error || !data?.tenant_id) throw new Error('Could not resolve tenant.')
  return data.tenant_id
}

export async function createFaq(data: {
  question: string
  answer: string
}): Promise<ActionResult> {
  try {
    const tenant_id = await requireTenantId()
    const supabase = createClient()

    // Use MAX(sort_order) + 1 so new FAQs append to the bottom.
    const { data: last } = await supabase
      .from('faqs')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const sort_order = last ? last.sort_order + 1 : 0

    const { error } = await supabase.from('faqs').insert({
      tenant_id,
      question: data.question.trim(),
      answer: data.answer.trim(),
      sort_order,
      is_active: true,
    })

    if (error) return { error: error.message }
    revalidatePath(FAQS_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateFaq(
  id: string,
  data: { question: string; answer: string },
): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('faqs')
      .update({
        question: data.question.trim(),
        answer: data.answer.trim(),
      })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(FAQS_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function toggleFaqActive(
  id: string,
  is_active: boolean,
): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('faqs')
      .update({ is_active })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(FAQS_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('faqs').delete().eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(FAQS_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
