/**
 * Telegram bot client factory using Grammy.
 * Each tenant has its own bot token stored in channels.config.bot_token.
 * This factory creates a per-tenant bot instance as needed.
 */
import { Bot } from 'grammy'

export function createTelegramBot(botToken: string) {
  return new Bot(botToken)
}
