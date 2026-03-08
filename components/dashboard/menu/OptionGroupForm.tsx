'use client'

import { useState, type FormEvent } from 'react'
import type { Database } from '@/types/database'

type OptionGroupRow = Database['public']['Tables']['menu_option_groups']['Row']

interface Props {
  itemId: string
  editing: OptionGroupRow | null
  onSubmit: (formData: FormData) => Promise<void>
  onClose: () => void
}

export default function OptionGroupForm({
  itemId,
  editing,
  onSubmit,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await onSubmit(new FormData(e.currentTarget))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="menu_item_id" value={itemId} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Group name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={editing?.name ?? ''}
          placeholder="e.g. Size, Extra Toppings"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max selections
        </label>
        <input
          name="max_selections"
          type="number"
          min={1}
          defaultValue={editing?.max_selections ?? ''}
          placeholder="Leave empty for unlimited"
          className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Empty = unlimited. Use 1 for a single-choice group (e.g. size).
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
          id="is_required"
          name="is_required"
          type="checkbox"
          defaultChecked={editing?.is_required ?? false}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label htmlFor="is_required" className="text-sm text-gray-700">
          Required (customer must choose)
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
          {loading
            ? 'Saving…'
            : editing
              ? 'Save Changes'
              : 'Create Option Group'}
        </button>
      </div>
    </form>
  )
}
