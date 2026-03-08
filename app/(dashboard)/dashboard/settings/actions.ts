'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'

const SETTINGS_PATH = '/dashboard/settings'

type ActionResult = { error: string } | null

export type DaySchedule = {
  enabled: boolean
  open: string   // "HH:MM"
  close: string  // "HH:MM"
}

export type OperatingHours = {
  monday:    DaySchedule
  tuesday:   DaySchedule
  wednesday: DaySchedule
  thursday:  DaySchedule
  friday:    DaySchedule
  saturday:  DaySchedule
  sunday:    DaySchedule
}

export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday:    { enabled: true,  open: '09:00', close: '22:00' },
  tuesday:   { enabled: true,  open: '09:00', close: '22:00' },
  wednesday: { enabled: true,  open: '09:00', close: '22:00' },
  thursday:  { enabled: true,  open: '09:00', close: '22:00' },
  friday:    { enabled: true,  open: '09:00', close: '23:00' },
  saturday:  { enabled: true,  open: '10:00', close: '23:00' },
  sunday:    { enabled: false, open: '10:00', close: '22:00' },
}

export async function updateBotSettings(data: {
  bot_name:         string | null
  welcome_message:  string | null
  language:         string
  operating_hours:  OperatingHours
  away_message:     string | null
}): Promise<ActionResult> {
  try {
    const supabase = createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .single()

    if (!profile?.tenant_id) return { error: 'Could not resolve tenant.' }

    const { error } = await supabase
      .from('tenants')
      .update({
        bot_name:        data.bot_name        || null,
        welcome_message: data.welcome_message || null,
        language:        data.language        || 'en',
        operating_hours: data.operating_hours as unknown as Json,
        away_message:    data.away_message    || null,
      })
      .eq('id', profile.tenant_id)

    if (error) return { error: error.message }
    revalidatePath(SETTINGS_PATH)
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
