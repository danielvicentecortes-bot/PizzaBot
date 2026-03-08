'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MENU_PATH = '/dashboard/menu'

type ActionResult = { error: string } | null

/** Resolves the caller's tenant_id. Throws if the user has no profile. */
async function requireTenantId(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .single()

  if (error || !data?.tenant_id) {
    throw new Error('Could not resolve tenant. Are you logged in?')
  }
  return data.tenant_id
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

export async function createCategory(formData: FormData): Promise<ActionResult> {
  try {
    const tenant_id = await requireTenantId()
    const supabase  = createClient()

    const { error } = await supabase.from('menu_categories').insert({
      tenant_id,
      name:        (formData.get('name') as string).trim(),
      description: (formData.get('description') as string | null)?.trim() || null,
      sort_order:  parseInt(formData.get('sort_order') as string) || 0,
      is_active:   formData.get('is_active') === 'true',
    })

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('menu_categories')
      .update({
        name:        (formData.get('name') as string).trim(),
        description: (formData.get('description') as string | null)?.trim() || null,
        sort_order:  parseInt(formData.get('sort_order') as string) || 0,
        is_active:   formData.get('is_active') === 'true',
      })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// ─────────────────────────────────────────────────────────────
// MENU ITEMS
// ─────────────────────────────────────────────────────────────

export async function createItem(formData: FormData): Promise<ActionResult> {
  try {
    const tenant_id = await requireTenantId()
    const supabase  = createClient()

    const allergens = (formData.get('allergens') as string)
      ?.split(',')
      .map((a) => a.trim())
      .filter(Boolean) ?? []

    const { error } = await supabase.from('menu_items').insert({
      tenant_id,
      category_id:    formData.get('category_id') as string,
      name:           (formData.get('name') as string).trim(),
      description:    (formData.get('description') as string | null)?.trim() || null,
      base_price:     parseFloat(formData.get('base_price') as string),
      allergens,
      is_vegetarian:  formData.get('is_vegetarian') === 'on',
      is_vegan:       formData.get('is_vegan') === 'on',
      is_gluten_free: formData.get('is_gluten_free') === 'on',
      is_available:   formData.get('is_available') === 'on',
      sort_order:     parseInt(formData.get('sort_order') as string) || 0,
    })

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateItem(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = createClient()

    const allergens = (formData.get('allergens') as string)
      ?.split(',')
      .map((a) => a.trim())
      .filter(Boolean) ?? []

    const { error } = await supabase
      .from('menu_items')
      .update({
        name:           (formData.get('name') as string).trim(),
        description:    (formData.get('description') as string | null)?.trim() || null,
        base_price:     parseFloat(formData.get('base_price') as string),
        allergens,
        is_vegetarian:  formData.get('is_vegetarian') === 'on',
        is_vegan:       formData.get('is_vegan') === 'on',
        is_gluten_free: formData.get('is_gluten_free') === 'on',
        is_available:   formData.get('is_available') === 'on',
        sort_order:     parseInt(formData.get('sort_order') as string) || 0,
      })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteItem(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('menu_items').delete().eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// ─────────────────────────────────────────────────────────────
// OPTION GROUPS
// ─────────────────────────────────────────────────────────────

export async function createOptionGroup(formData: FormData): Promise<ActionResult> {
  try {
    const tenant_id = await requireTenantId()
    const supabase  = createClient()

    const maxRaw = formData.get('max_selections') as string
    const max_selections = maxRaw ? parseInt(maxRaw) : null

    const { error } = await supabase.from('menu_option_groups').insert({
      tenant_id,
      menu_item_id:   formData.get('menu_item_id') as string,
      name:           (formData.get('name') as string).trim(),
      is_required:    formData.get('is_required') === 'on',
      max_selections,
      sort_order:     parseInt(formData.get('sort_order') as string) || 0,
    })

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateOptionGroup(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = createClient()

    const maxRaw = formData.get('max_selections') as string
    const max_selections = maxRaw ? parseInt(maxRaw) : null

    const { error } = await supabase
      .from('menu_option_groups')
      .update({
        name:           (formData.get('name') as string).trim(),
        is_required:    formData.get('is_required') === 'on',
        max_selections,
        sort_order:     parseInt(formData.get('sort_order') as string) || 0,
      })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteOptionGroup(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('menu_option_groups')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// ─────────────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────────────

export async function createOption(formData: FormData): Promise<ActionResult> {
  try {
    const tenant_id = await requireTenantId()
    const supabase  = createClient()

    const { error } = await supabase.from('menu_options').insert({
      tenant_id,
      option_group_id: formData.get('option_group_id') as string,
      name:            (formData.get('name') as string).trim(),
      price_delta:     parseFloat(formData.get('price_delta') as string) || 0,
      is_available:    formData.get('is_available') === 'on',
      sort_order:      parseInt(formData.get('sort_order') as string) || 0,
    })

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateOption(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('menu_options')
      .update({
        name:         (formData.get('name') as string).trim(),
        price_delta:  parseFloat(formData.get('price_delta') as string) || 0,
        is_available: formData.get('is_available') === 'on',
        sort_order:   parseInt(formData.get('sort_order') as string) || 0,
      })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteOption(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('menu_options').delete().eq('id', id)

    if (error) return { error: error.message }
    revalidatePath(MENU_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
