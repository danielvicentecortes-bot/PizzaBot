'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import type { Database } from '@/types/database'
import { clearTestConversation } from '@/app/(dashboard)/dashboard/test-chat/actions'

type MessageRow = Database['public']['Tables']['messages']['Row']

// A local message shape — lighter than the full DB row.
interface ChatMessage {
  id:      string
  role:    'user' | 'assistant'
  content: string
}

function rowToChat(row: MessageRow): ChatMessage | null {
  if (row.role !== 'user' && row.role !== 'assistant') return null
  return { id: row.id, role: row.role, content: row.content }
}

interface Props {
  tenantId:        string
  conversationId:  string
  initialMessages: MessageRow[]
  botName:         string
  welcomeMessage:  string | null
}

export default function TestChat({
  tenantId,
  conversationId,
  initialMessages,
  botName,
  welcomeMessage,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.flatMap((r) => rowToChat(r) ?? []),
  )
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send message ─────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setLoading(true)

    // Optimistic: add user bubble immediately
    const tempId = `tmp-${Date.now()}`
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: text }])

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id:       tenantId,
          conversation_id: conversationId,
          message:         text,
          channel_type:    'whatsapp',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
        // Remove optimistic message on hard error
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        return
      }

      setMessages((prev) => [
        ...prev,
        { id: `resp-${Date.now()}`, role: 'assistant', content: data.response },
      ])
    } catch (err) {
      setError('Network error — is the dev server running?')
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  // ── Clear conversation ───────────────────────────────────────
  async function handleClear() {
    if (!window.confirm('Clear the test conversation? All messages will be deleted.')) return
    const result = await clearTestConversation(conversationId)
    if (result?.error) {
      setError(result.error)
    } else {
      setMessages([])
      setError(null)
    }
  }

  // Enter submits; Shift+Enter adds newline
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-base font-semibold text-gray-900">{botName}</h1>
          <p className="text-xs text-gray-400">
            Simulating a customer conversation — messages are saved to the test
            conversation and will not affect live channels.
          </p>
        </div>
        <button
          onClick={handleClear}
          className="text-sm text-gray-400 hover:text-red-600 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Show welcome message if no messages yet */}
        {messages.length === 0 && welcomeMessage && (
          <BotBubble content={welcomeMessage} botName={botName} isWelcome />
        )}

        {messages.length === 0 && !welcomeMessage && (
          <div className="text-center text-sm text-gray-400 py-12">
            Send a message to start the test conversation.
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <UserBubble key={msg.id} content={msg.content} />
          ) : (
            <BotBubble key={msg.id} content={msg.content} botName={botName} />
          ),
        )}

        {/* Typing indicator while waiting */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
              {botName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message as a customer… (Enter to send)"
            rows={1}
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 max-h-32 overflow-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Shift+Enter for a newline · Enter to send
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Bubble sub-components
// ─────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xs sm:max-w-sm lg:max-w-md">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
          {content}
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">You (customer)</p>
      </div>
    </div>
  )
}

function BotBubble({
  content,
  botName,
  isWelcome = false,
}: {
  content: string
  botName: string
  isWelcome?: boolean
}) {
  return (
    <div className="flex items-end gap-2">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
        {botName.charAt(0).toUpperCase()}
      </div>
      <div className="max-w-xs sm:max-w-sm lg:max-w-md">
        <div
          className={`rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm whitespace-pre-wrap border ${
            isWelcome
              ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
              : 'bg-white border-gray-200 text-gray-800'
          }`}
        >
          {content}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {botName}
          {isWelcome && ' · Welcome message preview'}
        </p>
      </div>
    </div>
  )
}
