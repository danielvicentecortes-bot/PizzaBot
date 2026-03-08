'use client'

import { useState, type FormEvent } from 'react'
import type { Database } from '@/types/database'

type OptionRow = Database['public']['Tables']['menu_options']['Row']

interface Props {
  groupId: string
  editing: OptionRow | null
  onSubmit: (formData: FormData) => Promise<void>
  onClose: () => void
}

export default function OptionForm({ groupId, editing, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(new FormData(e.currentTarget))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="option_group_id" value={groupId} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Option name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={editing?.name ?? ''}
          placeholder="e.g. Large, Extra Cheese"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price adjustment (€)
        </label>
        <input
          name="price_delta"
          type="number"
          step="0.01"
          defaultValue={editing?.price_delta ?? 0}
          placeholder="0.00"
          className="w-36 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Added to the item's base price. Use 0 if included.
        </p>
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
          Available
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
          {loading ? 'Saving…' : editing ? 'Save Changes' : 'Create Option'}
        </button>
      </div>
    </form>
  )
}
