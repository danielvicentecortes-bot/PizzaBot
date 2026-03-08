'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import {
  createFaq,
  updateFaq,
  toggleFaqActive,
  deleteFaq,
} from '@/app/(dashboard)/dashboard/faqs/actions'

type FaqRow = Database['public']['Tables']['faqs']['Row']

interface Props {
  faqs: FaqRow[]
}

export default function FaqManager({ faqs }: Props) {
  const router = useRouter()

  // Which row is being edited: a UUID for existing FAQs, 'new' for the add form.
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  // ── Helpers ────────────────────────────────────────────────

  function startEdit(faq: FaqRow) {
    setEditingId(faq.id)
    setEditQuestion(faq.question)
    setEditAnswer(faq.answer)
    setFieldError(null)
  }

  function startNew() {
    setEditingId('new')
    setEditQuestion('')
    setEditAnswer('')
    setFieldError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setFieldError(null)
  }

  async function save() {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      setFieldError('Both question and answer are required.')
      return
    }
    setLoading(true)
    setFieldError(null)
    setGlobalError(null)

    const result =
      editingId === 'new'
        ? await createFaq({ question: editQuestion, answer: editAnswer })
        : await updateFaq(editingId!, {
            question: editQuestion,
            answer: editAnswer,
          })

    setLoading(false)
    if (result?.error) {
      setFieldError(result.error)
    } else {
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleToggle(faq: FaqRow) {
    const result = await toggleFaqActive(faq.id, !faq.is_active)
    if (result?.error) setGlobalError(result.error)
    else router.refresh()
  }

  async function handleDelete(faq: FaqRow) {
    if (
      !window.confirm(
        `Delete "${faq.question.slice(0, 60)}${faq.question.length > 60 ? '…' : ''}"? This cannot be undone.`,
      )
    )
      return
    const result = await deleteFaq(faq.id)
    if (result?.error) setGlobalError(result.error)
    else router.refresh()
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Global error */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {globalError}
        </div>
      )}

      {/* Empty state */}
      {faqs.length === 0 && editingId !== 'new' && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
          <p className="font-medium text-gray-500">No FAQs yet</p>
          <p className="text-sm mt-1">
            Add your first FAQ so the bot can answer common questions.
          </p>
        </div>
      )}

      {/* Existing FAQ rows */}
      {faqs.map((faq) =>
        editingId === faq.id ? (
          // ── Inline edit form ──────────────────────────────
          <InlineForm
            key={faq.id}
            question={editQuestion}
            answer={editAnswer}
            onQuestionChange={setEditQuestion}
            onAnswerChange={setEditAnswer}
            onSave={save}
            onCancel={cancelEdit}
            loading={loading}
            error={fieldError}
          />
        ) : (
          // ── Display row ───────────────────────────────────
          <div
            key={faq.id}
            className={`bg-white border rounded-lg px-4 py-3 transition-opacity ${
              faq.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Q: {faq.question}
                </p>
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
                  A: {faq.answer}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Active toggle */}
                <button
                  onClick={() => handleToggle(faq)}
                  title={faq.is_active ? 'Disable FAQ' : 'Enable FAQ'}
                  className={`w-8 h-8 rounded flex items-center justify-center text-sm transition-colors ${
                    faq.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {faq.is_active ? '●' : '○'}
                </button>
                <button
                  onClick={() => startEdit(faq)}
                  disabled={editingId !== null}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(faq)}
                  disabled={editingId !== null}
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-700 rounded hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ),
      )}

      {/* New FAQ inline form */}
      {editingId === 'new' && (
        <InlineForm
          question={editQuestion}
          answer={editAnswer}
          onQuestionChange={setEditQuestion}
          onAnswerChange={setEditAnswer}
          onSave={save}
          onCancel={cancelEdit}
          loading={loading}
          error={fieldError}
          isNew
        />
      )}

      {/* Add button */}
      {editingId === null && (
        <button
          onClick={startNew}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          + Add FAQ
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// InlineForm — shared by both "edit existing" and "add new"
// ─────────────────────────────────────────────────────────────
function InlineForm({
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
  onSave,
  onCancel,
  loading,
  error,
  isNew = false,
}: {
  question: string
  answer: string
  onQuestionChange: (v: string) => void
  onAnswerChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
  isNew?: boolean
}) {
  return (
    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg px-4 py-3 space-y-3">
      {isNew && (
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
          New FAQ
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="e.g. What are your opening hours?"
          autoFocus
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="e.g. We're open Monday to Sunday, 11 AM – 10 PM."
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
