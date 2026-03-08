-- ============================================================
-- PizzaBot — Initial Schema
-- Multi-tenant, shared tables + Row Level Security
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── HELPER: updated_at trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── TENANTS ─────────────────────────────────────────────────
-- One row per pizzeria (B2B customer / subscriber).
CREATE TABLE tenants (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL,
  slug            TEXT        UNIQUE NOT NULL,  -- used for webhook routing: /api/webhooks/twilio?tenant=<slug>
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  logo_url        TEXT,
  primary_color   TEXT        NOT NULL DEFAULT '#E53E3E',
  timezone        TEXT        NOT NULL DEFAULT 'UTC',
  currency        TEXT        NOT NULL DEFAULT 'EUR',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PROFILES ────────────────────────────────────────────────
-- Dashboard users (owners + staff) — extends auth.users.
CREATE TABLE profiles (
  id          UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID    REFERENCES tenants(id) ON DELETE SET NULL,
  full_name   TEXT,
  role        TEXT    NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────
-- Stripe subscription state per tenant.
CREATE TABLE subscriptions (
  id                      UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID    NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT    UNIQUE,
  stripe_subscription_id  TEXT    UNIQUE,
  plan                    TEXT    NOT NULL DEFAULT 'starter',
  status                  TEXT    NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing','active','past_due','canceled','unpaid')),
  trial_ends_at           TIMESTAMPTZ,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── CHANNELS ────────────────────────────────────────────────
-- Messaging channel configuration per tenant.
CREATE TABLE channels (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK (type IN ('whatsapp','sms','telegram')),
  -- Stored as JSONB so each channel type can have different credential fields.
  -- WhatsApp/SMS: { "phone_number": "+1...", "account_sid": "...", "auth_token": "..." }
  -- Telegram:     { "bot_token": "...", "webhook_secret": "..." }
  config      JSONB   NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, type)
);
CREATE TRIGGER channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MENU CATEGORIES ─────────────────────────────────────────
CREATE TABLE menu_categories (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER menu_categories_updated_at BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MENU ITEMS ──────────────────────────────────────────────
CREATE TABLE menu_items (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID          NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name            TEXT          NOT NULL,
  description     TEXT,
  base_price      NUMERIC(10,2) NOT NULL,
  image_url       TEXT,
  allergens       TEXT[]        NOT NULL DEFAULT '{}',
  is_vegetarian   BOOLEAN       NOT NULL DEFAULT false,
  is_vegan        BOOLEAN       NOT NULL DEFAULT false,
  is_gluten_free  BOOLEAN       NOT NULL DEFAULT false,
  is_available    BOOLEAN       NOT NULL DEFAULT true,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MENU OPTION GROUPS ──────────────────────────────────────
-- Groups of options belonging to a menu item, e.g. "Size", "Extra Toppings".
CREATE TABLE menu_option_groups (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  menu_item_id    UUID    NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  is_required     BOOLEAN NOT NULL DEFAULT false,
  max_selections  INTEGER,          -- NULL = unlimited (e.g. toppings)
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER menu_option_groups_updated_at BEFORE UPDATE ON menu_option_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MENU OPTIONS ────────────────────────────────────────────
-- Individual selectable options within a group, e.g. "Small", "Medium", "Large".
CREATE TABLE menu_options (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  option_group_id   UUID          NOT NULL REFERENCES menu_option_groups(id) ON DELETE CASCADE,
  name              TEXT          NOT NULL,
  price_delta       NUMERIC(10,2) NOT NULL DEFAULT 0,  -- added to item base_price
  is_available      BOOLEAN       NOT NULL DEFAULT true,
  sort_order        INTEGER       NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER menu_options_updated_at BEFORE UPDATE ON menu_options
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── FAQS ────────────────────────────────────────────────────
CREATE TABLE faqs (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question    TEXT    NOT NULL,
  answer      TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── CONVERSATIONS ───────────────────────────────────────────
-- One row per end-customer ↔ channel session.
CREATE TABLE conversations (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type    TEXT    NOT NULL CHECK (channel_type IN ('whatsapp','sms','telegram')),
  external_id     TEXT    NOT NULL,   -- phone number (E.164) or Telegram chat_id
  customer_name   TEXT,
  customer_phone  TEXT,
  status          TEXT    NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','resolved','archived')),
  metadata        JSONB   NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, channel_type, external_id)
);
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE messages (
  id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id     UUID    NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                TEXT    NOT NULL CHECK (role IN ('user','assistant','system')),
  content             TEXT    NOT NULL,
  external_message_id TEXT,   -- Twilio SID or Telegram message_id (deduplication)
  metadata            JSONB   NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: messages are immutable
);
CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX messages_created_at_idx ON messages(conversation_id, created_at);

-- ─── ORDERS ──────────────────────────────────────────────────
CREATE TABLE orders (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                 UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id           UUID          REFERENCES conversations(id) ON DELETE SET NULL,
  order_number              TEXT          NOT NULL,  -- e.g. "#042" — generated per tenant
  customer_name             TEXT,
  customer_phone            TEXT,
  type                      TEXT          NOT NULL DEFAULT 'delivery'
                            CHECK (type IN ('delivery','pickup','dine_in')),
  status                    TEXT          NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','preparing','ready','delivered','canceled')),
  delivery_address          TEXT,
  notes                     TEXT,
  subtotal                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                     NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_time_minutes    INTEGER,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, order_number)
);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ORDER ITEMS ─────────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID          REFERENCES menu_items(id) ON DELETE SET NULL,
  name            TEXT          NOT NULL,           -- snapshot at order time
  unit_price      NUMERIC(10,2) NOT NULL,
  quantity        INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal        NUMERIC(10,2) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── ORDER ITEM OPTIONS ──────────────────────────────────────
CREATE TABLE order_item_options (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_item_id   UUID          NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  menu_option_id  UUID          REFERENCES menu_options(id) ON DELETE SET NULL,
  name            TEXT          NOT NULL,           -- snapshot at order time
  price_delta     NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── RESERVATIONS ────────────────────────────────────────────
CREATE TABLE reservations (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID    REFERENCES conversations(id) ON DELETE SET NULL,
  customer_name   TEXT    NOT NULL,
  customer_phone  TEXT,
  party_size      INTEGER NOT NULL CHECK (party_size > 0),
  reserved_at     TIMESTAMPTZ NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','canceled','no_show')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: resolves tenant_id from the currently authenticated user
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Enable RLS on every tenant-scoped table
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_option_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations         ENABLE ROW LEVEL SECURITY;

-- ── tenants: owner sees only their own row ──
CREATE POLICY "tenants: select own" ON tenants
  FOR SELECT USING (id = auth_tenant_id());
CREATE POLICY "tenants: update own" ON tenants
  FOR UPDATE USING (id = auth_tenant_id());

-- ── profiles: users see only their own profile ──
CREATE POLICY "profiles: select own" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: update own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ── Generic tenant-scoped policy macro ──
-- Applied to: subscriptions, channels, menu_categories, menu_items,
--             menu_option_groups, menu_options, faqs, conversations,
--             messages, orders, order_items, order_item_options, reservations

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'subscriptions','channels',
    'menu_categories','menu_items','menu_option_groups','menu_options',
    'faqs','conversations','messages',
    'orders','order_items','order_item_options',
    'reservations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_select" ON %I FOR SELECT USING (tenant_id = auth_tenant_id());',
      t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_insert" ON %I FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());',
      t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_update" ON %I FOR UPDATE USING (tenant_id = auth_tenant_id());',
      t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_delete" ON %I FOR DELETE USING (tenant_id = auth_tenant_id());',
      t
    );
  END LOOP;
END;
$$;

-- NOTE: Webhook API routes (Twilio, Telegram, Stripe) MUST use the
-- Supabase SERVICE ROLE key, which bypasses RLS entirely.
-- Never expose the service role key to the browser.
