import { createClient } from '@/lib/supabase/server'
import MenuManager from '@/components/dashboard/menu/MenuManager'
import type { CategoryWithItems } from '@/components/dashboard/menu/MenuManager'

export const metadata = { title: 'Menu Management — PizzaBot' }

export default async function MenuPage() {
  const supabase = createClient()

  // Single query fetches the full 4-level hierarchy:
  //   categories → items → option_groups → options
  // RLS ensures only this tenant's data is returned.
  const { data: categories, error } = await supabase
    .from('menu_categories')
    .select(
      `*,
       menu_items (
         *,
         menu_option_groups (
           *,
           menu_options ( * )
         )
       )`,
    )
    .order('sort_order', { ascending: true })
    .order('sort_order', { ascending: true, referencedTable: 'menu_items' })
    .order('sort_order', {
      ascending: true,
      referencedTable: 'menu_option_groups',
    })
    .order('sort_order', {
      ascending: true,
      referencedTable: 'menu_options',
    })

  if (error) {
    return (
      <div className="p-8 text-red-600">
        Failed to load menu: {error.message}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage categories, items, and options.
            </p>
          </div>
        </div>

        <MenuManager categories={(categories ?? []) as CategoryWithItems[]} />
      </div>
    </div>
  )
}
