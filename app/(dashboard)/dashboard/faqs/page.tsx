import { createClient } from '@/lib/supabase/server'
import FaqManager from '@/components/dashboard/faqs/FaqManager'
import type { Database } from '@/types/database'

export const metadata = { title: 'FAQs — PizzaBot' }

type FaqRow = Database['public']['Tables']['faqs']['Row']

export default async function FaqsPage() {
  const supabase = createClient()

  const { data: faqs, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return (
      <div className="p-8 text-red-600">
        Failed to load FAQs: {error.message}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-1">
            These answers are included in the bot&apos;s knowledge base so it
            can respond accurately to common questions.
          </p>
        </div>

        <FaqManager faqs={(faqs ?? []) as FaqRow[]} />
      </div>
    </div>
  )
}
