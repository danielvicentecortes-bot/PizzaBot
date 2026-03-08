/**
 * Builds the Claude system prompt for a given tenant's chatbot session.
 * Called by /api/chat on every request — always uses fresh DB data.
 *
 * No I/O here: this is a pure function so it is easy to unit-test.
 */

import type { Database } from '@/types/database'
import type { OperatingHours } from '@/app/(dashboard)/dashboard/settings/actions'

// ─── Supabase row types ───────────────────────────────────────────────────────
type TenantRow      = Database['public']['Tables']['tenants']['Row']
type CategoryRow    = Database['public']['Tables']['menu_categories']['Row']
type ItemRow        = Database['public']['Tables']['menu_items']['Row']
type OptionGroupRow = Database['public']['Tables']['menu_option_groups']['Row']
type OptionRow      = Database['public']['Tables']['menu_options']['Row']
type FaqRow         = Database['public']['Tables']['faqs']['Row']

export type CategoryWithItems = CategoryRow & {
  menu_items: (ItemRow & {
    menu_option_groups: (OptionGroupRow & {
      menu_options: OptionRow[]
    })[]
  })[]
}

// ─── Currency helpers ─────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'CHF',
  JPY: '¥',
  BRL: 'R$',
}

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code
}

function fmtPrice(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`
}

// ─── Operating-hours helpers ──────────────────────────────────────────────────
const DAY_LABELS: Record<string, string> = {
  monday:    'Monday',
  tuesday:   'Tuesday',
  wednesday: 'Wednesday',
  thursday:  'Thursday',
  friday:    'Friday',
  saturday:  'Saturday',
  sunday:    'Sunday',
}

function getOperatingStatus(
  hours: OperatingHours | null,
  timezone: string,
): { isOpen: boolean; scheduleLines: string } {
  if (!hours) {
    return { isOpen: true, scheduleLines: 'Open 24/7 (no hours configured)' }
  }

  const now = new Date()

  // Day name in the tenant's timezone, lower-cased to match OperatingHours keys.
  const dayName = now
    .toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' })
    .toLowerCase() as keyof OperatingHours

  // Current HH:MM in tenant timezone using hourCycle h23 for 00-23 range.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const currentTime = `${h}:${m}`

  const todaySchedule = hours[dayName]
  const isOpen =
    !!todaySchedule?.enabled &&
    currentTime >= todaySchedule.open &&
    currentTime <= todaySchedule.close

  const scheduleLines = (Object.keys(hours) as (keyof OperatingHours)[])
    .map((day) => {
      const s = hours[day]
      return s.enabled
        ? `  ${DAY_LABELS[day]}: ${s.open}–${s.close}`
        : `  ${DAY_LABELS[day]}: Closed`
    })
    .join('\n')

  return { isOpen, scheduleLines }
}

// ─── Menu formatter ───────────────────────────────────────────────────────────
function formatMenu(categories: CategoryWithItems[], symbol: string): string {
  const activeCategories = categories.filter((c) => c.is_active)
  if (activeCategories.length === 0) return '(Menu not yet configured)'

  const sections = activeCategories
    .map((cat) => {
      const availableItems = cat.menu_items.filter((i) => i.is_available)
      if (availableItems.length === 0) return null

      const itemBlocks = availableItems.map((item) => {
        const badges: string[] = []
        if (item.is_vegetarian) badges.push('V')
        if (item.is_vegan) badges.push('VE')
        if (item.is_gluten_free) badges.push('GF')

        let block = `- ${item.name} — ${fmtPrice(Number(item.base_price), symbol)}`
        if (badges.length) block += ` [${badges.join(', ')}]`
        if (item.description) block += `\n  ${item.description}`
        if (item.allergens.length) block += `\n  Allergens: ${item.allergens.join(', ')}`

        if (item.menu_option_groups.length > 0) {
          const groupLines = item.menu_option_groups.map((group) => {
            const req = group.is_required ? 'required' : 'optional'
            const maxStr =
              group.max_selections === null
                ? 'unlimited'
                : group.max_selections === 1
                  ? 'choose 1'
                  : `choose up to ${group.max_selections}`

            const optionsList = group.menu_options
              .map((opt) => {
                const delta = Number(opt.price_delta)
                const price = delta === 0 ? 'included' : `+${fmtPrice(delta, symbol)}`
                return `${opt.name} (${price})`
              })
              .join(', ')

            return `  ${group.name} (${req}, ${maxStr}): ${optionsList}`
          })
          block += '\n' + groupLines.join('\n')
        }

        return block
      })

      return `[${cat.name}]\n${itemBlocks.join('\n\n')}`
    })
    .filter(Boolean)

  return sections.join('\n\n')
}

// ─── FAQ formatter ────────────────────────────────────────────────────────────
function formatFaqs(faqs: Pick<FaqRow, 'question' | 'answer'>[]): string {
  if (faqs.length === 0) return '(No FAQs configured)'
  return faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
}

// ─── Language label ───────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface BuildPromptParams {
  tenant:      TenantRow
  categories:  CategoryWithItems[]
  faqs:        Pick<FaqRow, 'question' | 'answer'>[]
  channelType: string
}

export function buildSystemPrompt({
  tenant,
  categories,
  faqs,
  channelType,
}: BuildPromptParams): string {
  const sym        = currencySymbol(tenant.currency)
  const botName    = tenant.bot_name ?? `${tenant.name} Assistant`
  const langLabel  = LANG_LABELS[tenant.language] ?? tenant.language
  const channelLbl =
    channelType === 'telegram' ? 'Telegram'
    : channelType === 'sms'    ? 'SMS'
    :                            'WhatsApp'

  const { isOpen, scheduleLines } = getOperatingStatus(
    tenant.operating_hours as OperatingHours | null,
    tenant.timezone,
  )

  // Current date/time in the tenant's own timezone for grounding.
  const currentDateTime = new Date().toLocaleString('en-US', {
    timeZone: tenant.timezone,
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    hourCycle: 'h23',
  })

  const menuSection = formatMenu(categories, sym)
  const faqSection  = formatFaqs(faqs)

  return `\
You are ${botName}, the AI assistant for ${tenant.name}, helping customers via ${channelLbl}.

## ROLE
You are a friendly, knowledgeable pizzeria employee. You can:
- Answer questions about the menu, prices, ingredients, and allergens
- Help customers place orders (delivery, pickup, or dine-in)
- Handle table reservations
- Answer frequently asked questions

## COMMUNICATION STYLE
- Warm, friendly, and concise — customers are on mobile; keep replies short
- Plain text only: do NOT use markdown (no asterisks, no bullet symbols, no hash headings)
- Always confirm order details back to the customer before finalising
- Never invent menu items, prices, or ingredients — only what is listed below
- If you do not know something, say so honestly
- Language to use: ${langLabel}

## PIZZERIA INFO
Name: ${tenant.name}
Currency: ${tenant.currency} (${sym})
Timezone: ${tenant.timezone}
Current date/time: ${currentDateTime}

## OPERATING HOURS
${scheduleLines}
Status RIGHT NOW: ${isOpen ? 'OPEN' : 'CLOSED'}
${!isOpen && tenant.away_message ? `\nAWAY MESSAGE (use this when closed):\n"${tenant.away_message}"` : ''}

## WELCOME MESSAGE
${tenant.welcome_message ?? `Hello! I'm ${botName}. How can I help you today?`}

## MENU
${menuSection}

## FAQS
${faqSection}

## TAKING AN ORDER
1. Ask for order type: delivery, pickup, or dine-in
2. Take the full order — items, quantities, and any chosen options
3. For delivery: ask for the delivery address
4. Repeat the complete order back to the customer with a total in ${sym}
5. Confirm and give an estimated time (delivery ~30–45 min, pickup ~15–20 min)

## TAKING A RESERVATION
1. Ask for: date, time, number of guests, and customer name
2. Confirm the details back to the customer
3. Let them know the reservation is noted and suggest calling if changes are needed

## RULES
- If currently CLOSED and an away message is set, use it as your reply
- Only offer items that appear in the MENU section above
- Keep all prices in ${sym}
- Do not use formatting characters like *, **, #, or - in your replies — plain sentences only
`
}
