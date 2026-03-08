'use client'

import { useState, type FormEvent } from 'react'
import type { Database } from '@/types/database'
import {
  updateBotSettings,
  DEFAULT_OPERATING_HOURS,
  type OperatingHours,
  type DaySchedule,
} from '@/app/(dashboard)/dashboard/settings/actions'

type TenantRow = Database['public']['Tables']['tenants']['Row']

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
]

const DAYS: { key: keyof OperatingHours; label: string }[] = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
]

interface Props {
  tenant: TenantRow
  initialOperatingHours: OperatingHours
}

export default function BotSettingsForm({ tenant, initialOperatingHours }: Props) {
  const [botName, setBotName]               = useState(tenant.bot_name ?? '')
  const [welcomeMessage, setWelcomeMessage] = useState(tenant.welcome_message ?? '')
  const [language, setLanguage]             = useState(tenant.language ?? 'en')
  const [hours, setHours]                   = useState<OperatingHours>(initialOperatingHours)
  const [awayMessage, setAwayMessage]       = useState(tenant.away_message ?? '')
  const [loading, setLoading]               = useState(false)
  const [success, setSuccess]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  function updateDay(day: keyof OperatingHours, patch: Partial<DaySchedule>) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }))
    setSuccess(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)

    const result = await updateBotSettings({
      bot_name:        botName        || null,
      welcome_message: welcomeMessage || null,
      language,
      operating_hours: hours,
      away_message:    awayMessage    || null,
    })

    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Bot identity ──────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Identity
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bot name
          </label>
          <input
            type="text"
            value={botName}
            onChange={(e) => { setBotName(e.target.value); setSuccess(false) }}
            placeholder={`e.g. PizzaBot by ${tenant.name}`}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            How the bot introduces itself in conversations.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); setSuccess(false) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Welcome message
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => { setWelcomeMessage(e.target.value); setSuccess(false) }}
            rows={3}
            placeholder={`e.g. Hello! I'm ${botName || 'your pizza assistant'}. How can I help you today?`}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Sent automatically when a customer starts a new conversation.
          </p>
        </div>
      </section>

      {/* ── Operating hours ───────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Operating Hours
        </h2>
        <p className="text-xs text-gray-400">
          Outside these hours the bot replies with your away message instead of
          processing orders.
        </p>

        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const day = hours[key]
            return (
              <div key={key} className="flex items-center gap-3 flex-wrap">
                {/* Enabled toggle */}
                <label className="flex items-center gap-2 w-32 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span
                    className={`text-sm ${
                      day.enabled ? 'text-gray-700 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </label>

                {/* Time inputs */}
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    day.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'
                  }`}
                >
                  <input
                    type="time"
                    value={day.open}
                    onChange={(e) => updateDay(key, { open: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e) => updateDay(key, { close: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Reset to defaults */}
        <button
          type="button"
          onClick={() => { setHours(DEFAULT_OPERATING_HOURS); setSuccess(false) }}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Reset to defaults
        </button>
      </section>

      {/* ── Away message ──────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Away Message
        </h2>

        <div>
          <textarea
            value={awayMessage}
            onChange={(e) => { setAwayMessage(e.target.value); setSuccess(false) }}
            rows={3}
            placeholder="e.g. We're currently closed. Our opening hours are Mon–Fri 9am–10pm. Leave your number and we'll get back to you!"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Sent when customers message outside operating hours. Leave empty to
            let the bot respond normally at all times.
          </p>
        </div>
      </section>

      {/* ── Save bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {success && (
            <p className="text-sm text-green-600 font-medium">
              Settings saved successfully.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
