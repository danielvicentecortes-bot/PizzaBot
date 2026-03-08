'use client'

import { useState, type FormEvent } from 'react'
import type { Database } from '@/types/database'

type ItemRow = Database['public']['Tables']['menu_items']['Row']

interface Props {
  categoryId: string
  editing: ItemRow | null
  onSubmit: (formData: FormData) => Promise<void>
  onClose: () => void
}

export default function ItemForm({ categoryId, editing, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(new FormData(e.currentTarget))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pass category_id as hidden field */}
      <input type="hidden" name="category_id" value={categoryId} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={editing?.name ?? ''}
          placeholder="e.g. Margherita"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          rows={2}
          defaultValue={editing?.description ?? ''}
          placeholder="Ingredients, preparation style…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Base price (€) <span className="text-red-500">*</span>
        </label>
        <input
          name="base_price"
          type="number"
          required
          step="0.01"
          min="0"
          defaultValue={editing?.base_price ?? ''}
          placeholder="0.00"
          className="w-36 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allergens
        </label>
        <input
          name="allergens"
          type="text"
          defaultValue={editing?.allergens?.join(', ') ?? ''}
          placeholder="gluten, dairy, nuts (comma-separated)"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_vegetarian"
            defaultChecked={editing?.is_vegetarian ?? false}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          Vegetarian
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_vegan"
            defaultChecked={editing?.is_vegan ?? false}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          Vegan
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_gluten_free"
            defaultChecked={editing?.is_gluten_free ?? false}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          Gluten-free
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sort order
        </label>
        <input
          name="sort_order"
          type="number"
          defaultValue={editing?.sort_order ?? 0}
          min={0}
          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_available"
          name="is_available"
          type="checkbox"
          defaultChecked={editing?.is_available ?? true}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label htmlFor="is_available" className="text-sm text-gray-700">
          Available for ordering
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving…' : editing ? 'Save Changes' : 'Create Item'}
        </button>
      </div>
    </form>
  )
}
