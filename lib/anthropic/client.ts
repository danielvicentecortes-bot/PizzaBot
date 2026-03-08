/**
 * Anthropic Claude client.
 * Only instantiated server-side (API routes / Server Actions).
 * The API key must never be exposed to the browser.
 */
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const CHAT_MODEL = 'claude-sonnet-4-6'

/** Max tokens for a single chatbot response. */
export const MAX_TOKENS = 1024
