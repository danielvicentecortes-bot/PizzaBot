/**
 * Twilio client factory.
 * Uses the platform-level credentials for sending messages.
 * Per-tenant credentials (if ever needed for direct billing) live in channels.config.
 */
import twilio from 'twilio'

export function createTwilioClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )
}

export const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER! // e.g. "whatsapp:+14155238886"
export const TWILIO_SMS_FROM = process.env.TWILIO_SMS_NUMBER!
