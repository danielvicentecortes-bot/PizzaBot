'use client'

import { useState, type FormEvent } from 'react'
import type { Database } from '@/types/database'

type CategoryRow = Database['public']['Tables']['menu_categories']['Row']

interface Props {
  editing: CategoryRow | null
  onSubmit: (formData: FormData) => Promise<void>
  onClose: () => void
}

export default function CategoryForm({ editing, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(new FormData(e.currentTarget))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={editing?.name ?? ''}
          placeholder="e.g. Pizzas"
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
          placeholder="Short description (optional)"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
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

      {/* is_active passed as a hidden field keyed on checkbox presence */}
      <div className="flex items-center gap-2">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          value="true"
          defaultChecked={editing?.is_active ?? true}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Active (visible to the chatbot)
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
          {loading ? 'Saving…' : editing ? 'Save Changes' : 'Create Category'}
        </button>
      </div>
    </form>
  )
}
