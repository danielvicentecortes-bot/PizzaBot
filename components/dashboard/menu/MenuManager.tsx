'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import {
  createCategory,    updateCategory,    deleteCategory,
  createItem,        updateItem,        deleteItem,
  createOptionGroup, updateOptionGroup, deleteOptionGroup,
  createOption,      updateOption,      deleteOption,
} from '@/app/(dashboard)/dashboard/menu/actions'
import CategoryForm from './CategoryForm'
import ItemForm from './ItemForm'
import OptionGroupForm from './OptionGroupForm'
import OptionForm from './OptionForm'
import Modal from './Modal'

// ─── Convenience types ────────────────────────────────────────
type MenuCategory    = Database['public']['Tables']['menu_categories']['Row']
type MenuItem        = Database['public']['Tables']['menu_items']['Row']
type OptionGroup     = Database['public']['Tables']['menu_option_groups']['Row']
type MenuOption      = Database['public']['Tables']['menu_options']['Row']

export type CategoryWithItems = MenuCategory & {
  menu_items: (MenuItem & {
    menu_option_groups: (OptionGroup & {
      menu_options: MenuOption[]
    })[]
  })[]
}

// ─── Modal state discriminated union ─────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'category'; editing: MenuCategory | null }
  | { type: 'item'; categoryId: string; editing: MenuItem | null }
  | { type: 'optionGroup'; itemId: string; editing: OptionGroup | null }
  | { type: 'option'; groupId: string; editing: MenuOption | null }

// ─── Props ────────────────────────────────────────────────────
interface Props {
  categories: CategoryWithItems[]
}

export default function MenuManager({ categories }: Props) {
  const router = useRouter()
  const [modal, setModal]               = useState<ModalState>({ type: 'none' })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [actionError, setActionError]   = useState<string | null>(null)

  // ── Helpers ─────────────────────────────────────────────────

  function closeModal() {
    setModal({ type: 'none' })
    setActionError(null)
  }

  async function run(
    action: () => Promise<{ error: string } | null>,
  ): Promise<boolean> {
    setActionError(null)
    const result = await action()
    if (result?.error) {
      setActionError(result.error)
      return false
    }
    router.refresh()
    return true
  }

  async function runAndClose(
    action: () => Promise<{ error: string } | null>,
  ) {
    const ok = await run(action)
    if (ok) closeModal()
  }

  function toggleItem(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function confirmDelete(
    label: string,
    action: () => Promise<{ error: string } | null>,
  ) {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    await run(action)
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Global action error */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {actionError}
        </div>
      )}

      {/* Category sections */}
      {categories.length === 0 && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-lg font-medium text-gray-500">No categories yet</p>
          <p className="text-sm mt-1">Add your first category to get started.</p>
        </div>
      )}

      {categories.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          expandedItems={expandedItems}
          onToggleItem={toggleItem}
          onEditCategory={() => setModal({ type: 'category', editing: cat })}
          onDeleteCategory={() =>
            confirmDelete(cat.name, () => deleteCategory(cat.id))
          }
          onAddItem={() =>
            setModal({ type: 'item', categoryId: cat.id, editing: null })
          }
          onEditItem={(item) =>
            setModal({ type: 'item', categoryId: cat.id, editing: item })
          }
          onDeleteItem={(item) =>
            confirmDelete(item.name, () => deleteItem(item.id))
          }
          onAddOptionGroup={(itemId) =>
            setModal({ type: 'optionGroup', itemId, editing: null })
          }
          onEditOptionGroup={(group) =>
            setModal({
              type: 'optionGroup',
              itemId: group.menu_item_id,
              editing: group,
            })
          }
          onDeleteOptionGroup={(group) =>
            confirmDelete(group.name, () => deleteOptionGroup(group.id))
          }
          onAddOption={(groupId) =>
            setModal({ type: 'option', groupId, editing: null })
          }
          onEditOption={(opt) =>
            setModal({
              type: 'option',
              groupId: opt.option_group_id,
              editing: opt,
            })
          }
          onDeleteOption={(opt) =>
            confirmDelete(opt.name, () => deleteOption(opt.id))
          }
        />
      ))}

      {/* Add category button */}
      <button
        onClick={() => setModal({ type: 'category', editing: null })}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
      >
        + Add Category
      </button>

      {/* ── Modals ─────────────────────────────────────────── */}

      {modal.type === 'category' && (
        <Modal
          title={modal.editing ? 'Edit Category' : 'New Category'}
          onClose={closeModal}
        >
          {actionError && (
            <p className="mb-3 text-sm text-red-600">{actionError}</p>
          )}
          <CategoryForm
            editing={modal.editing}
            onSubmit={(formData) =>
              runAndClose(() =>
                modal.editing
                  ? updateCategory(modal.editing.id, formData)
                  : createCategory(formData),
              )
            }
            onClose={closeModal}
          />
        </Modal>
      )}

      {modal.type === 'item' && (
        <Modal
          title={modal.editing ? 'Edit Item' : 'New Item'}
          onClose={closeModal}
        >
          {actionError && (
            <p className="mb-3 text-sm text-red-600">{actionError}</p>
          )}
          <ItemForm
            categoryId={modal.categoryId}
            editing={modal.editing}
            onSubmit={(formData) =>
              runAndClose(() =>
                modal.editing
                  ? updateItem(modal.editing.id, formData)
                  : createItem(formData),
              )
            }
            onClose={closeModal}
          />
        </Modal>
      )}

      {modal.type === 'optionGroup' && (
        <Modal
          title={modal.editing ? 'Edit Option Group' : 'New Option Group'}
          onClose={closeModal}
        >
          {actionError && (
            <p className="mb-3 text-sm text-red-600">{actionError}</p>
          )}
          <OptionGroupForm
            itemId={modal.itemId}
            editing={modal.editing}
            onSubmit={(formData) =>
              runAndClose(() =>
                modal.editing
                  ? updateOptionGroup(modal.editing.id, formData)
                  : createOptionGroup(formData),
              )
            }
            onClose={closeModal}
          />
        </Modal>
      )}

      {modal.type === 'option' && (
        <Modal
          title={modal.editing ? 'Edit Option' : 'New Option'}
          onClose={closeModal}
        >
          {actionError && (
            <p className="mb-3 text-sm text-red-600">{actionError}</p>
          )}
          <OptionForm
            groupId={modal.groupId}
            editing={modal.editing}
            onSubmit={(formData) =>
              runAndClose(() =>
                modal.editing
                  ? updateOption(modal.editing.id, formData)
                  : createOption(formData),
              )
            }
            onClose={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CategorySection
// ─────────────────────────────────────────────────────────────
type MenuItem2        = CategoryWithItems['menu_items'][number]
type OptionGroup2     = MenuItem2['menu_option_groups'][number]
type MenuOption2      = OptionGroup2['menu_options'][number]

function CategorySection({
  category,
  expandedItems,
  onToggleItem,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddOptionGroup,
  onEditOptionGroup,
  onDeleteOptionGroup,
  onAddOption,
  onEditOption,
  onDeleteOption,
}: {
  category: CategoryWithItems
  expandedItems: Set<string>
  onToggleItem: (id: string) => void
  onEditCategory: () => void
  onDeleteCategory: () => void
  onAddItem: () => void
  onEditItem: (item: MenuItem2) => void
  onDeleteItem: (item: MenuItem2) => void
  onAddOptionGroup: (itemId: string) => void
  onEditOptionGroup: (group: OptionGroup2) => void
  onDeleteOptionGroup: (group: OptionGroup2) => void
  onAddOption: (groupId: string) => void
  onEditOption: (opt: MenuOption2) => void
  onDeleteOption: (opt: MenuOption2) => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Category header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-800">{category.name}</h2>
          {!category.is_active && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              Hidden
            </span>
          )}
          {category.description && (
            <span className="text-sm text-gray-400 hidden sm:inline">
              {category.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddItem}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            + Add Item
          </button>
          <button
            onClick={onEditCategory}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDeleteCategory}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {category.menu_items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No items yet.{' '}
            <button
              onClick={onAddItem}
              className="text-indigo-600 hover:underline"
            >
              Add one
            </button>
          </div>
        ) : (
          category.menu_items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              expanded={expandedItems.has(item.id)}
              onToggle={() => onToggleItem(item.id)}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item)}
              onAddOptionGroup={() => onAddOptionGroup(item.id)}
              onEditOptionGroup={onEditOptionGroup}
              onDeleteOptionGroup={onDeleteOptionGroup}
              onAddOption={onAddOption}
              onEditOption={onEditOption}
              onDeleteOption={onDeleteOption}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ItemRow
// ─────────────────────────────────────────────────────────────
function ItemRow({
  item,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddOptionGroup,
  onEditOptionGroup,
  onDeleteOptionGroup,
  onAddOption,
  onEditOption,
  onDeleteOption,
}: {
  item: MenuItem2
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddOptionGroup: () => void
  onEditOptionGroup: (g: OptionGroup2) => void
  onDeleteOptionGroup: (g: OptionGroup2) => void
  onAddOption: (groupId: string) => void
  onEditOption: (opt: MenuOption2) => void
  onDeleteOption: (opt: MenuOption2) => void
}) {
  return (
    <div>
      {/* Item row */}
      <div className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800">{item.name}</span>
            {!item.is_available && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Unavailable
              </span>
            )}
            {item.is_vegetarian && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                V
              </span>
            )}
            {item.is_vegan && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                VE
              </span>
            )}
            {item.is_gluten_free && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                GF
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              {item.description}
            </p>
          )}
          {item.allergens.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Allergens: {item.allergens.join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <span className="font-medium text-gray-700">
            €{Number(item.base_price).toFixed(2)}
          </span>
          <button
            onClick={onToggle}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            Options {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={onEdit}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Option groups panel */}
      {expanded && (
        <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
          <div className="space-y-3 mt-3">
            {item.menu_option_groups.length === 0 && (
              <p className="text-xs text-gray-400 italic">No option groups.</p>
            )}
            {item.menu_option_groups.map((group) => (
              <OptionGroupRow
                key={group.id}
                group={group}
                onEdit={() => onEditOptionGroup(group)}
                onDelete={() => onDeleteOptionGroup(group)}
                onAddOption={() => onAddOption(group.id)}
                onEditOption={onEditOption}
                onDeleteOption={onDeleteOption}
              />
            ))}
          </div>
          <button
            onClick={onAddOptionGroup}
            className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            + Add Option Group
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OptionGroupRow
// ─────────────────────────────────────────────────────────────
function OptionGroupRow({
  group,
  onEdit,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
}: {
  group: OptionGroup2
  onEdit: () => void
  onDelete: () => void
  onAddOption: () => void
  onEditOption: (opt: MenuOption2) => void
  onDeleteOption: (opt: MenuOption2) => void
}) {
  return (
    <div className="bg-white rounded border border-gray-200 p-3">
      {/* Group header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{group.name}</span>
          {group.is_required && (
            <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
          <span className="text-xs text-gray-400">
            {group.max_selections == null
              ? 'unlimited'
              : `max ${group.max_selections}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-1">
        {group.menu_options.length === 0 && (
          <p className="text-xs text-gray-400 italic">No options yet.</p>
        )}
        {group.menu_options.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{opt.name}</span>
              {!opt.is_available && (
                <span className="text-xs text-amber-600">(unavailable)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">
                {opt.price_delta === 0
                  ? 'included'
                  : `+€${Number(opt.price_delta).toFixed(2)}`}
              </span>
              <button
                onClick={() => onEditOption(opt)}
                className="text-xs text-gray-400 hover:text-gray-700 px-1 rounded hover:bg-gray-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteOption(opt)}
                className="text-xs text-red-400 hover:text-red-600 px-1 rounded hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAddOption}
        className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
      >
        + Add Option
      </button>
    </div>
  )
}
