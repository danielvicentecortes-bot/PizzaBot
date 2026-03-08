-- 0003_bot_settings.sql
-- Adds chatbot configuration columns to the tenants table.
-- These drive the AI system prompt and per-channel behaviour.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS bot_name         TEXT,
  ADD COLUMN IF NOT EXISTS welcome_message  TEXT,
  ADD COLUMN IF NOT EXISTS language         TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS operating_hours  JSONB,
  ADD COLUMN IF NOT EXISTS away_message     TEXT;

COMMENT ON COLUMN tenants.bot_name        IS 'Display name for the chatbot, e.g. "PizzaBot by Mario''s"';
COMMENT ON COLUMN tenants.welcome_message IS 'First message the bot sends when a customer starts a conversation';
COMMENT ON COLUMN tenants.language        IS 'BCP-47 language tag for bot replies (default: en)';
COMMENT ON COLUMN tenants.operating_hours IS 'JSONB map of day → {enabled, open, close} in HH:MM format';
COMMENT ON COLUMN tenants.away_message    IS 'Reply sent when a customer messages outside operating hours';
